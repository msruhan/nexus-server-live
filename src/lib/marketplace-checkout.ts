import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateOrderCode } from '@/lib/generate-order-code';
import { validateImeiOrderDeviceInput } from '@/lib/imei-order-input';
import { parseServerFieldDefs, validateServerOrderFields } from '@/lib/server-fields';
import { scheduleImeiOrderFollowUp } from '@/lib/imei-order-scheduler';
import { scheduleServerOrderFollowUp } from '@/lib/server-order-scheduler';
import { pollImeiOrderFromSupplier, submitImeiOrderToSupplier } from '@/lib/imei-order-worker';
import { pollServerOrderFromSupplier, submitServerOrderToSupplier } from '@/lib/server-order-worker';
import { resolveSupplierCostAtOrder } from '@/lib/supplier-cost';
import { isMarketplacePaymentReference } from '@/lib/marketplace-order-guard';
import { toNum } from '@/lib/supplier-sync/money';
import { logActivity } from '@/lib/activity';
import { isMarketplaceSystemGuestUser, displayNameFromEmail } from '@/lib/marketplace-guest-user';
import { notifyOrderCreated, notifyAdminNewOrder } from '@/lib/email/notify';
import { createInvoice } from '@/lib/invoice/service';
import { notifyTelegramOrderCreated, notifyTelegramAdminNewOrder } from '@/lib/telegram/notify';

function safeJsonParse(input: string): Record<string, string> {
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]),
    );
  } catch {
    return {};
  }
}

function amountsMatch(a: Prisma.Decimal | number, b: Prisma.Decimal | number): boolean {
  return Math.abs(toNum(a) - toNum(b)) < 0.01;
}

async function resolveMarketplaceOrderUserName(
  userId: string,
  email: string,
  isGuest: boolean,
): Promise<string> {
  if (isGuest) return displayNameFromEmail(email) || email;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return user?.name ?? user?.email ?? email ?? 'Unknown';
}

function notifyMarketplaceOrderCreated(input: {
  kind: 'imei' | 'server';
  userId: string;
  userName: string;
  orderCode: string;
  serviceName: string;
  price: string;
  orderId: string;
  imei?: string;
}) {
  void notifyOrderCreated({ kind: input.kind, orderId: input.orderId });
  void notifyTelegramOrderCreated({
    userId: input.userId,
    orderCode: input.orderCode,
    serviceName: input.serviceName,
    imei: input.imei,
    price: input.price,
  });
  void notifyTelegramAdminNewOrder({
    orderCode: input.orderCode,
    userName: input.userName,
    serviceName: input.serviceName,
    price: input.price,
  });
  void notifyAdminNewOrder({
    orderCode: input.orderCode,
    userName: input.userName,
    serviceName: input.serviceName,
    price: input.price,
    kind: input.kind,
  });
}

/**
 * Fulfill a guest marketplace checkout after payment is verified.
 * Does NOT credit the user wallet — payment goes straight to order creation.
 */
export async function fulfillMarketplaceCheckoutByIntent(
  intentId: string,
  txHash?: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const checkout = await prisma.marketplaceCheckout.findFirst({
    where: { paymentIntentId: intentId },
    include: { paymentIntent: true },
  });

  if (!checkout) return { ok: true };
  if (checkout.status === 'COMPLETED') return { ok: true };
  if (checkout.status === 'FAILED') return { ok: false, reason: 'checkout_failed' };

  const intent = checkout.paymentIntent;
  if (!intent) {
    await markCheckoutFailed(checkout.id, 'Missing payment intent');
    return { ok: false, reason: 'missing_intent' };
  }

  if (intent.purpose !== 'marketplace') {
    await markCheckoutFailed(checkout.id, 'Payment is not a marketplace checkout');
    return { ok: false, reason: 'invalid_purpose' };
  }

  if (!isMarketplacePaymentReference(intent.reference)) {
    await markCheckoutFailed(checkout.id, 'Invalid marketplace payment reference');
    return { ok: false, reason: 'invalid_reference' };
  }

  if (!amountsMatch(intent.amount, checkout.quotedAmount)) {
    await markCheckoutFailed(checkout.id, 'Paid amount does not match quoted service price');
    return { ok: false, reason: 'amount_mismatch' };
  }

  if (intent.status === 'CANCELLED' || intent.status === 'EXPIRED' || intent.status === 'FAILED') {
    await markCheckoutFailed(checkout.id, `Payment intent ${intent.status.toLowerCase()}`);
    return { ok: false, reason: `intent_${intent.status.toLowerCase()}` };
  }

  const locked = await prisma.marketplaceCheckout.updateMany({
    where: { id: checkout.id, status: { in: ['AWAITING_PAYMENT', 'PROCESSING'] } },
    data: { status: 'PROCESSING' },
  });
  if (locked.count === 0 && checkout.status !== 'PROCESSING') {
    return { ok: false, reason: 'checkout_locked' };
  }

  try {
    if (intent.status === 'PENDING') {
      await prisma.paymentIntent.update({
        where: { id: intent.id, status: 'PENDING' },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          txHash: txHash ?? intent.txHash,
        },
      });
    } else if (intent.status !== 'CONFIRMED') {
      await markCheckoutFailed(checkout.id, `Unexpected payment status: ${intent.status}`);
      return { ok: false, reason: 'intent_not_confirmed' };
    }

    const freshIntent = await prisma.paymentIntent.findUnique({ where: { id: intent.id } });
    if (!freshIntent || freshIntent.status !== 'CONFIRMED') {
      await markCheckoutFailed(checkout.id, 'Payment confirmation failed');
      return { ok: false, reason: 'confirm_failed' };
    }

    const payload = safeJsonParse(checkout.payload);
    const effectivePrice = new Prisma.Decimal(checkout.quotedAmount);

    if (checkout.kind === 'imei') {
      await fulfillImeiCheckout(checkout, payload, effectivePrice);
    } else {
      await fulfillServerCheckout(checkout, payload, effectivePrice);
    }

    const activityUserId = (await isMarketplaceSystemGuestUser(checkout.userId))
      ? null
      : checkout.userId;

    await logActivity({
      userId: activityUserId,
      action: 'marketplace.checkout_completed',
      entity: 'MarketplaceCheckout',
      entityId: checkout.id,
      metadata: { kind: checkout.kind, serviceId: checkout.serviceId, intentId: intent.id },
    });

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Fulfillment failed';
    await markCheckoutFailed(checkout.id, message);
    console.error('[MARKETPLACE_FULFILL]', intentId, e);
    return { ok: false, reason: message };
  }
}

async function markCheckoutFailed(checkoutId: string, message: string) {
  await prisma.marketplaceCheckout.updateMany({
    where: { id: checkoutId, status: { in: ['AWAITING_PAYMENT', 'PROCESSING'] } },
    data: { status: 'FAILED', errorMessage: message },
  });
}

async function fulfillImeiCheckout(
  checkout: { id: string; userId: string; serviceId: string; email: string },
  payload: Record<string, string>,
  effectivePrice: Prisma.Decimal,
) {
  const isGuest = await isMarketplaceSystemGuestUser(checkout.userId);
  const service = await prisma.imeiService.findFirst({
    where: { id: checkout.serviceId, status: 'ACTIVE' },
    select: {
      id: true,
      title: true,
      price: true,
      supplierPrice: true,
      requiresImei: true,
      requiresNetwork: true,
      requiresModel: true,
      requiresProvider: true,
      requiresPin: true,
      requiresKbh: true,
      requiresMep: true,
      requiresPrd: true,
      requiresSn: true,
      requiresEcid: true,
    },
  });
  if (!service) throw new Error('Service not found or inactive');

  const deviceInput = validateImeiOrderDeviceInput(service, payload);
  if (deviceInput.error) throw new Error(deviceInput.error);

  const required: Array<{ key: string; label: string; flag: boolean }> = [
    { key: 'network', label: 'Network', flag: service.requiresNetwork },
    { key: 'model', label: 'Model', flag: service.requiresModel },
    { key: 'provider', label: 'Provider', flag: service.requiresProvider },
    { key: 'pin', label: 'PIN', flag: service.requiresPin },
    { key: 'kbh', label: 'KBH', flag: service.requiresKbh },
    { key: 'mep', label: 'MEP', flag: service.requiresMep },
    { key: 'prd', label: 'PRD', flag: service.requiresPrd },
    { key: 'serialNumber', label: 'Serial Number', flag: service.requiresSn },
    { key: 'ecid', label: 'ECID', flag: service.requiresEcid },
  ];
  for (const r of required) {
    if (r.flag && !`${payload[r.key] ?? ''}`.trim()) {
      throw new Error(`Field ${r.label} is required`);
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.imeiOrder.create({
      data: {
        orderCode: generateOrderCode(),
        userId: checkout.userId,
        serviceId: service.id,
        imei: deviceInput.imei,
        price: effectivePrice,
        supplierCost: resolveSupplierCostAtOrder(service),
        status: 'PENDING',
        network: payload.network || null,
        model: payload.model || null,
        provider: payload.provider || null,
        pin: payload.pin || null,
        kbh: payload.kbh || null,
        mep: payload.mep || null,
        prd: payload.prd || null,
        serialNumber: deviceInput.serialNumber,
        ecid: deviceInput.ecid,
        note: payload.note || null,
        guestEmail: isGuest ? checkout.email : null,
      },
    });

    await tx.marketplaceCheckout.update({
      where: { id: checkout.id },
      data: {
        status: 'COMPLETED',
        orderType: 'imei',
        orderId: created.id,
        errorMessage: null,
      },
    });

    return created;
  });

  try {
    const submitted = await submitImeiOrderToSupplier(order.id);
    if (submitted.ok && submitted.referenceId) {
      void pollImeiOrderFromSupplier(order.id).catch(() => null);
    }
    scheduleImeiOrderFollowUp(order.id);
  } catch {
    scheduleImeiOrderFollowUp(order.id);
  }

  const userName = await resolveMarketplaceOrderUserName(checkout.userId, checkout.email, isGuest);
  notifyMarketplaceOrderCreated({
    kind: 'imei',
    userId: checkout.userId,
    userName,
    orderCode: order.orderCode,
    serviceName: service.title,
    price: order.price.toString(),
    orderId: order.id,
    imei: deviceInput.imei,
  });
  void createInvoice({
    userId: checkout.userId,
    kind: 'ORDER',
    amount: effectivePrice,
    description: `Marketplace order ${order.orderCode} — ${service.title}`,
    refType: 'ImeiOrder',
    refId: order.id,
    orderCode: order.orderCode,
    buyerEmail: isGuest ? checkout.email : undefined,
    buyerName: isGuest ? displayNameFromEmail(checkout.email) : undefined,
  });
}

async function fulfillServerCheckout(
  checkout: { id: string; userId: string; serviceId: string; email: string },
  payload: Record<string, string>,
  effectivePrice: Prisma.Decimal,
) {
  const isGuest = await isMarketplaceSystemGuestUser(checkout.userId);
  const service = await prisma.serverService.findFirst({
    where: { id: checkout.serviceId, status: 'ACTIVE' },
    select: {
      id: true,
      title: true,
      price: true,
      supplierPrice: true,
      requiredFields: true,
    },
  });
  if (!service) throw new Error('Service not found or inactive');

  const fieldDefs = parseServerFieldDefs(service.requiredFields);
  const validation = validateServerOrderFields(fieldDefs, payload);
  if (!validation.ok) throw new Error(validation.error ?? 'Invalid order fields');

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.serverOrder.create({
      data: {
        orderCode: generateOrderCode(),
        userId: checkout.userId,
        serviceId: service.id,
        price: effectivePrice,
        supplierCost: resolveSupplierCostAtOrder(service),
        status: 'PENDING',
        email: validation.email || checkout.email,
        notes: validation.notes,
        requiredFields:
          Object.keys(validation.fields).length > 0 ? JSON.stringify(validation.fields) : null,
      },
    });

    await tx.marketplaceCheckout.update({
      where: { id: checkout.id },
      data: {
        status: 'COMPLETED',
        orderType: 'server',
        orderId: created.id,
        errorMessage: null,
      },
    });

    return created;
  });

  try {
    const submitted = await submitServerOrderToSupplier(order.id);
    if (submitted.ok && submitted.referenceId) {
      void pollServerOrderFromSupplier(order.id).catch(() => null);
    }
    scheduleServerOrderFollowUp(order.id);
  } catch {
    scheduleServerOrderFollowUp(order.id);
  }

  const userName = await resolveMarketplaceOrderUserName(checkout.userId, checkout.email, isGuest);
  notifyMarketplaceOrderCreated({
    kind: 'server',
    userId: checkout.userId,
    userName,
    orderCode: order.orderCode,
    serviceName: service.title,
    price: order.price.toString(),
    orderId: order.id,
  });
  void createInvoice({
    userId: checkout.userId,
    kind: 'ORDER',
    amount: effectivePrice,
    description: `Marketplace order ${order.orderCode} — ${service.title}`,
    refType: 'ServerOrder',
    refId: order.id,
    orderCode: order.orderCode,
    buyerEmail: isGuest ? checkout.email : undefined,
    buyerName: isGuest ? displayNameFromEmail(checkout.email) : undefined,
  });
}

/** @deprecated use fulfillMarketplaceCheckoutByIntent */
export async function finalizeMarketplaceCheckoutByIntent(intentId: string): Promise<void> {
  await fulfillMarketplaceCheckoutByIntent(intentId);
}
