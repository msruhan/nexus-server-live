import { createHash, timingSafeEqual } from 'crypto';
import { resolveSupplierCostAtOrder } from '@/lib/supplier-cost';
import { prisma } from '@/lib/db';
import { pollImeiOrderFromSupplier, submitImeiOrderToSupplier } from '@/lib/imei-order-worker';
import { scheduleImeiOrderFollowUp } from '@/lib/imei-order-scheduler';
import { pollServerOrderFromSupplier, submitServerOrderToSupplier } from '@/lib/server-order-worker';
import { scheduleServerOrderFollowUp } from '@/lib/server-order-scheduler';
import { parseServerFieldDefs, validateServerOrderFields } from '@/lib/server-fields';
import { getClientIp } from '@/lib/ip-utils';
import { generateOrderCode } from '@/lib/generate-order-code';
import { extractFeedbackInput } from '@/lib/feedback/input';
import {
  clearFailureCounter,
  consumeRateBuckets,
  enforceIpPolicy,
  enforceRateLimit,
  enforceThrottle,
  recordAttempt,
  recordFailure,
} from '@/lib/api-key-security';
import { requireRuntimeLicense } from '@/lib/license-guard';
import { enforceGlobalApiWhitelist, isIpBlocked } from '@/lib/global-ip-policy';

export const dynamic = 'force-dynamic';

type DhruOk = { SUCCESS: Array<Record<string, unknown>>; apiversion: string };
type DhruErr = { ERROR: Array<{ MESSAGE: string }> };

const DHRU_VERSION = 'NexusServer-DhruCompat-1.0';

function ok(payload: Record<string, unknown>): Response {
  const body: DhruOk = { SUCCESS: [payload], apiversion: DHRU_VERSION };
  return Response.json(body);
}

function err(message: string, status = 200): Response {
  const body: DhruErr = { ERROR: [{ MESSAGE: message }] };
  return Response.json(body, { status });
}

function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function parseXmlLikeParameters(raw: string | null): Record<string, string> {
  if (!raw?.trim()) return {};
  const parseTags = (source: string): Record<string, string> => {
    const out: Record<string, string> = {};
    const re = /<([A-Z0-9_.-]+)>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      out[match[1].toUpperCase()] = String(match[2] ?? '').trim();
    }
    return out;
  };

  const first = parseTags(raw);
  if (!first.PARAMETERS) return first;

  // Dhru Classic wraps payload in <PARAMETERS>...</PARAMETERS>; parse inner tags too.
  const nested = parseTags(first.PARAMETERS);
  return Object.keys(nested).length > 0 ? nested : first;
}

function decodeCustomField(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const text = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k.toUpperCase(), String(v ?? '').trim()]),
    );
  } catch {
    return {};
  }
}

function asDhruStatus(status: string): number {
  if (status === 'SUCCESS') return 4;
  if (status === 'REJECTED' || status === 'CANCELLED') return 3;
  if (status === 'IN_PROCESS') return 1;
  return 0;
}

async function authClassic(username: string, apiaccesskey: string): Promise<
  | {
      ok: true;
      userId: string;
      apiKeyId: string;
      role: string;
      // Full key record exposed for downstream security policy enforcement.
      // Fields not used by existing call sites — added to keep signature
      // backward-compatible while enabling new policy checks.
      key: Awaited<ReturnType<typeof loadApiKeyFull>>;
    }
  | { ok: false; response: Response; reason?: string }
> {
  if (!username || !apiaccesskey) {
    return { ok: false, response: err('Invalid username or API access key') };
  }

  const row = await prisma.apiKey.findFirst({
    where: {
      apiUsername: username,
      isActive: true,
      user: { isActive: true },
    },
    include: {
      user: { select: { id: true, role: true } },
    },
  });
  if (!row) return { ok: false, response: err('Authentication failed') };
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, response: err('API key expired') };
  }

  const incomingHash = hashApiKey(apiaccesskey);
  const a = Buffer.from(incomingHash, 'utf8');
  const b = Buffer.from(row.keyHash, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    void recordFailure(row.id);
    void recordAttempt({
      apiKeyId: row.id,
      outcome: 'REJECTED_AUTH',
      reason: 'API key hash mismatch',
    });
    return {
      ok: false,
      response: err('Authentication failed'),
      reason: 'API key hash mismatch',
    };
  }

  await prisma.apiKey.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    ok: true,
    userId: row.user.id,
    apiKeyId: row.id,
    role: row.user.role,
    key: row,
  };
}

// Helper to type the full ApiKey row (with user relation) used above.
async function loadApiKeyFull(id: string) {
  return prisma.apiKey.findUnique({
    where: { id },
    include: { user: { select: { id: true, role: true } } },
  });
}

async function buildClassicImeiListPayload() {
  const services = await prisma.imeiService.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ group: { sortOrder: 'asc' } }, { title: 'asc' }],
    include: { group: { select: { title: true } } },
  });

  const list: Record<string, { GROUPNAME: string; GROUPTYPE: string; SERVICES: Record<string, Record<string, string>> }> = {};

  for (const svc of services) {
    const groupName = svc.group.title || 'IMEI Services';
    const groupKey = `IMEI-${groupName}`;
    if (!list[groupKey]) {
      list[groupKey] = { GROUPNAME: groupName, GROUPTYPE: 'IMEI', SERVICES: {} };
    }
    list[groupKey].SERVICES[String(svc.id)] = {
      SERVICEID: String(svc.id),
      SERVICENAME: svc.title,
      SERVICETYPE: 'IMEI',
      CREDIT: svc.price.toString(),
      TIME: svc.deliveryTime || '',
      INFO: svc.description || '',
      'Requires.Network': svc.requiresNetwork ? 'Required' : 'Optional',
      'Requires.Mobile': svc.requiresModel ? 'Required' : 'Optional',
      'Requires.Provider': svc.requiresProvider ? 'Required' : 'Optional',
      'Requires.PIN': svc.requiresPin ? 'Required' : 'Optional',
      'Requires.KBH': svc.requiresKbh ? 'Required' : 'Optional',
      'Requires.MEP': svc.requiresMep ? 'Required' : 'Optional',
      'Requires.PRD': svc.requiresPrd ? 'Required' : 'Optional',
      'Requires.SN': svc.requiresSn ? 'Required' : 'Optional',
      'Requires.ECID': svc.requiresEcid ? 'Required' : 'Optional',
    };
  }

  return list;
}

async function buildClassicServerListPayload() {
  const services = await prisma.serverService.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ box: { sortOrder: 'asc' } }, { title: 'asc' }],
    include: { box: { select: { title: true } } },
  });

  const list: Record<string, { GROUPNAME: string; GROUPTYPE: string; SERVICES: Record<string, Record<string, unknown>> }> = {};

  for (const svc of services) {
    const boxName = svc.box.title || 'Server Services';
    const groupKey = `SERVER-${boxName}`;
    if (!list[groupKey]) {
      list[groupKey] = { GROUPNAME: boxName, GROUPTYPE: 'SERVER', SERVICES: {} };
    }
    const fieldDefs = parseServerFieldDefs(svc.requiredFields);
    const requiresCustom = fieldDefs.map((f) => ({
      fieldname: f.key,
      // Structured field metadata (Dhru parity, additive — old `fieldname`
      // key preserved so existing parsers keep working).
      label: f.label,
      type: f.type,
      required: f.required ? 1 : 0,
    }));

    list[groupKey].SERVICES[String(svc.id)] = {
      SERVICEID: String(svc.id),
      SERVICENAME: svc.title,
      SERVICETYPE: 'SERVER',
      CREDIT: svc.price.toString(),
      TIME: svc.deliveryTime || '',
      INFO: svc.description || '',
      ...(requiresCustom.length > 0 ? { 'Requires.Custom': requiresCustom } : {}),
      ...(svc.quantity > 1 ? { MINQNT: String(svc.quantity) } : {}),
    };
  }

  return list;
}

function pickServerFieldPayload(params: Record<string, string>): Record<string, string> {
  const custom = decodeCustomField(params.CUSTOMFIELD);
  const merged = { ...params, ...custom };
  const blacklist = new Set([
    'ID',
    'IMEI',
    'CUSTOMFIELD',
    'QNT',
    'QUANTITY',
    'ACTION',
    'USERNAME',
    'APIACCESSKEY',
    'REQUESTFORMAT',
    'PARAMETERS',
  ]);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(merged)) {
    const key = k.toUpperCase();
    if (blacklist.has(key)) continue;
    if (!String(v ?? '').trim()) continue;
    out[k.toLowerCase()] = String(v).trim();
  }
  return out;
}

async function placeImeiStyleOrder(userId: string, params: Record<string, string>): Promise<Response> {
  const serviceId = String(params.ID || params.SERVICEID || '').trim();
  if (!serviceId) return err('ID service is required');

  const imei = String(params.IMEI || '').trim();
  const custom = decodeCustomField(params.CUSTOMFIELD);
  const merged = { ...params, ...custom };
  const serial = String(merged.SN ?? merged.SERIALNUMBER ?? '').trim();
  const ecid = String(merged.ECID ?? '').trim();

  // Optional Dhru-compatible callback inputs (SSRF-validated, additive).
  // Drawn from top-level params and/or the decoded CUSTOMFIELD payload.
  const feedback = extractFeedbackInput(merged);

  const imeiSvc = await prisma.imeiService.findFirst({
    where: { id: serviceId, status: 'ACTIVE' },
  });
  if (imeiSvc) {
    // Respect service-specific input requirements:
    // - SN-only services accept SN/SERIALNUMBER (alphanumeric)
    // - IMEI services require 15-17 numeric IMEI
    if (imeiSvc.requiresSn && !imeiSvc.requiresImei && !imeiSvc.requiresEcid) {
      if (!serial) return err('Serial Number is required');
    } else if (imeiSvc.requiresEcid && !imeiSvc.requiresImei && !imeiSvc.requiresSn) {
      if (!ecid) return err('ECID is required');
    } else if (!imei || !/^\d{15,17}$/.test(imei)) {
      return err('IMEI must be 15-17 digits');
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return err('Insufficient balance');

    // Tiered pricing — see /api/imei/orders for rationale. We import dynamically
    // to avoid pulling pricing module into the hot path of every Dhru request.
    const { resolveServicePriceForUser } = await import('@/lib/pricing');
    const resolved = await resolveServicePriceForUser({
      userId,
      serviceId: imeiSvc.id,
      kind: 'imei',
      basePrice: imeiSvc.price,
    });
    const effectivePrice = resolved.price as typeof imeiSvc.price;

    if (wallet.balance.lessThan(effectivePrice)) {
      return err('Insufficient balance');
    }

    const order = await prisma.$transaction(async (tx) => {
      const freshWallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      if (freshWallet.balance.lessThan(effectivePrice)) {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      const newBalance = freshWallet.balance.sub(effectivePrice);
      await tx.wallet.update({ where: { id: freshWallet.id }, data: { balance: newBalance } });

      const created = await tx.imeiOrder.create({
        data: {
          orderCode: generateOrderCode(),
          userId,
          serviceId: imeiSvc.id,
          imei: imei || serial || ecid,
          price: effectivePrice,
          supplierCost: resolveSupplierCostAtOrder(imeiSvc),
          status: 'PENDING',
          network: merged.NETWORK ?? null,
          model: merged.MODEL ?? null,
          provider: merged.PROVIDER ?? null,
          pin: merged.PIN ?? null,
          kbh: merged.KBH ?? null,
          mep: merged.MEP ?? null,
          prd: merged.PRD ?? null,
          serialNumber: serial || null,
          ecid: ecid || null,
          // Dhru-compatible callback (all optional; defaults preserve old behavior).
          callerReference: feedback.callerReference,
          feedbackUrl: feedback.feedbackUrl,
          quantity: feedback.quantity,
        },
      });

      await tx.walletLedger.create({
        data: {
          walletId: freshWallet.id,
          type: 'PAYMENT',
          amount: effectivePrice.neg(),
          balance: newBalance,
          description:
            resolved.source === 'retail'
              ? `Order IMEI ${imeiSvc.title} (Dhru compat API)`
              : `Order IMEI ${imeiSvc.title} (Dhru compat API, tier: ${resolved.groupName ?? '-'})`,
          referenceId: created.id,
        },
      });
      return created;
    });

    try {
      const submitted = await submitImeiOrderToSupplier(order.id);
      if (submitted.ok && submitted.referenceId) {
        void pollImeiOrderFromSupplier(order.id);
      }
      scheduleImeiOrderFollowUp(order.id);
    } catch (e) {
      console.error('[DHRU_SUPPLIER_PLACE_IMEI_SUBMIT]', e);
    }

    return ok({
      REFERENCEID: order.id,
      STATUS: 'Pending',
      MESSAGE: 'Order submitted',
      ...(feedback.callerReference ? { CUSTOMREFERENCE: feedback.callerReference } : {}),
    });
  }

  const srvSvc = await prisma.serverService.findFirst({
    where: { id: serviceId, status: 'ACTIVE' },
  });
  if (!srvSvc) return err('Service not found');

  const fieldDefs = parseServerFieldDefs(srvSvc.requiredFields);
  const validation = validateServerOrderFields(fieldDefs, pickServerFieldPayload(merged));
  if (!validation.ok) return err(validation.error ?? 'Invalid order data');

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return err('Insufficient balance');

  // Tiered pricing — see /api/imei/orders for rationale.
  const { resolveServicePriceForUser } = await import('@/lib/pricing');
  const resolved = await resolveServicePriceForUser({
    userId,
    serviceId: srvSvc.id,
    kind: 'server',
    basePrice: srvSvc.price,
  });
  const effectivePrice = resolved.price as typeof srvSvc.price;

  if (wallet.balance.lessThan(effectivePrice)) {
    return err('Insufficient balance');
  }

  const order = await prisma.$transaction(async (tx) => {
    const freshWallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    if (freshWallet.balance.lessThan(effectivePrice)) {
      throw new Error('INSUFFICIENT_BALANCE');
    }
    const newBalance = freshWallet.balance.sub(effectivePrice);
    await tx.wallet.update({ where: { id: freshWallet.id }, data: { balance: newBalance } });

    const created = await tx.serverOrder.create({
      data: {
        orderCode: generateOrderCode(),
        userId,
        serviceId: srvSvc.id,
        price: effectivePrice,
        supplierCost: resolveSupplierCostAtOrder(srvSvc),
        status: 'PENDING',
        email: validation.email,
        notes: validation.notes,
        requiredFields:
          Object.keys(validation.fields).length > 0 ? JSON.stringify(validation.fields) : null,
        // Dhru-compatible callback (all optional; defaults preserve old behavior).
        callerReference: feedback.callerReference,
        feedbackUrl: feedback.feedbackUrl,
        quantity: feedback.quantity,
      },
    });

    await tx.walletLedger.create({
      data: {
        walletId: freshWallet.id,
        type: 'PAYMENT',
        amount: effectivePrice.neg(),
        balance: newBalance,
        description:
          resolved.source === 'retail'
            ? `Server order ${srvSvc.title} (Dhru compat API)`
            : `Server order ${srvSvc.title} (Dhru compat API, tier: ${resolved.groupName ?? '-'})`,
        referenceId: created.id,
      },
    });
    return created;
  });

  try {
    const submitted = await submitServerOrderToSupplier(order.id);
    if (submitted.ok && submitted.referenceId) {
      void pollServerOrderFromSupplier(order.id);
    }
    scheduleServerOrderFollowUp(order.id);
  } catch (e) {
    console.error('[DHRU_SUPPLIER_PLACE_SERVER_SUBMIT]', e);
  }

  return ok({
    REFERENCEID: order.id,
    STATUS: 'Pending',
    MESSAGE: 'Order submitted',
    ...(feedback.callerReference ? { CUSTOMREFERENCE: feedback.callerReference } : {}),
  });
}

async function getImeiStyleOrderStatus(params: Record<string, string>): Promise<Response> {
  const id = String(params.ID || params.REFERENCEID || '').trim();
  if (!id) return err('ID order is required');

  const imeiOrder = await prisma.imeiOrder.findUnique({ where: { id } });
  if (imeiOrder) {
    return ok({
      REFERENCEID: imeiOrder.id,
      STATUS: asDhruStatus(imeiOrder.status),
      CODE: imeiOrder.code ?? '',
      COMMENTS: imeiOrder.comments ?? '',
      // Dhru `replay` parity — base64 of the result code (or comments).
      replay: Buffer.from(
        (imeiOrder.code && imeiOrder.code.trim() ? imeiOrder.code : imeiOrder.comments) ?? '',
        'utf8',
      ).toString('base64'),
    });
  }

  const serverOrder = await prisma.serverOrder.findUnique({ where: { id } });
  if (serverOrder) {
    return ok({
      REFERENCEID: serverOrder.id,
      STATUS: asDhruStatus(serverOrder.status),
      CODE: serverOrder.code ?? '',
      COMMENTS: serverOrder.comments ?? '',
      replay: Buffer.from(
        (serverOrder.code && serverOrder.code.trim() ? serverOrder.code : serverOrder.comments) ?? '',
        'utf8',
      ).toString('base64'),
    });
  }

  return err('Order not found');
}

export async function POST(req: Request) {
  const form = await req.formData();
  const username = String(form.get('username') ?? '').trim().toLowerCase();
  const apiaccesskey = String(form.get('apiaccesskey') ?? '').trim();
  const action = String(form.get('action') ?? '').trim().toLowerCase();
  const parametersRaw = String(form.get('parameters') ?? '');
  const parameters = parseXmlLikeParameters(parametersRaw);

  const clientIp = getClientIp(req);
  const userAgent = req.headers.get('user-agent');

  if (clientIp && (await isIpBlocked(clientIp))) {
    return err('Your IP address is blocked from accessing this service.');
  }

  const auth = await authClassic(username, apiaccesskey);
  if (!auth.ok) {
    return auth.response;
  }

  if (action === 'placeimeiorder' || action === 'placeserverorder') {
    const licenseDenied = await requireRuntimeLicense();
    if (licenseDenied) {
      const payload = (await licenseDenied.json()) as { reason?: string };
      return err(payload.reason ?? 'License inactive — storefront locked');
    }
  }

  // ─── Security policy (opt-in, non-breaking) ──────────────────
  // Keys with default settings (ipMode=none, no rate/spend limits)
  // skip every check below — preserving existing reseller behavior.
  const apiKey = auth.key!;
  if (apiKey) {
    const globalWhitelist = await enforceGlobalApiWhitelist(clientIp);
    if (!globalWhitelist.ok) {
      void recordAttempt({
        apiKeyId: auth.apiKeyId,
        outcome: 'REJECTED_IP',
        reason: globalWhitelist.reason,
        ip: clientIp,
        userAgent,
        action,
      });
      return err(globalWhitelist.reason);
    }

    const throttle = enforceThrottle(apiKey);
    if (!throttle.ok) {
      void recordAttempt({
        apiKeyId: auth.apiKeyId,
        outcome: throttle.outcome,
        reason: throttle.reason,
        ip: clientIp,
        userAgent,
        action,
      });
      return err(throttle.reason);
    }

    const ipCheck = await enforceIpPolicy(apiKey, clientIp, userAgent);
    if (!ipCheck.ok) {
      void recordFailure(auth.apiKeyId);
      void recordAttempt({
        apiKeyId: auth.apiKeyId,
        outcome: ipCheck.outcome,
        reason: ipCheck.reason,
        ip: clientIp,
        userAgent,
        action,
      });
      return err(ipCheck.reason);
    }

    const rateCheck = await enforceRateLimit(apiKey);
    if (!rateCheck.ok) {
      void recordAttempt({
        apiKeyId: auth.apiKeyId,
        outcome: rateCheck.outcome,
        reason: rateCheck.reason,
        ip: clientIp,
        userAgent,
        action,
      });
      return err(rateCheck.reason);
    }

    void clearFailureCounter(auth.apiKeyId);
    void consumeRateBuckets(
      auth.apiKeyId,
      (apiKey.rateLimitPerMinute ?? 0) > 0,
      (apiKey.rateLimitPerHour ?? 0) > 0,
    );
    void recordAttempt({
      apiKeyId: auth.apiKeyId,
      outcome: 'ALLOWED',
      ip: clientIp,
      userAgent,
      action,
    });
  }

  try {
    switch (action) {
      case 'accountinfo': {
        const wallet = await prisma.wallet.findUnique({ where: { userId: auth.userId } });
        return ok({
          AccoutInfo: {
            credit: wallet?.balance?.toString() ?? '0',
            username,
          },
        });
      }
      case 'imeiservicelist': {
        const imeiList = await buildClassicImeiListPayload();
        const serverList = await buildClassicServerListPayload();
        return ok({ LIST: { ...imeiList, ...serverList } });
      }
      case 'serverservicelist':
      case 'fileservicelist': {
        const list = await buildClassicServerListPayload();
        return ok({ LIST: list });
      }
      case 'placeimeiorder':
      case 'placeserverorder': {
        return await placeImeiStyleOrder(auth.userId, parameters);
      }
      case 'getimeiorder': {
        return await getImeiStyleOrderStatus(parameters);
      }
      default:
        return err(`Unsupported action: ${action}`);
    }
  } catch (e) {
    console.error('[DHRU_SUPPLIER_API_POST]', e);
    return err(e instanceof Error ? e.message : 'Internal server error');
  }
}

export async function GET() {
  return err('Use POST /api/index.php');
}

// Keep edge/runtime default Node.js behavior for crypto + Prisma.
export const runtime = 'nodejs';
