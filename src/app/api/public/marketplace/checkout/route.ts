import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createIntent, listEnabledGateways } from '@/lib/payment/registry';
import type { PaymentGatewayId } from '@/lib/payment/types';
import { ServiceStatus } from '@/lib/constants';
import { createImeiOrderSchema } from '@/lib/validations/imei';
import { createServerOrderSchema } from '@/lib/validations/server';
import { validateImeiOrderDeviceInput } from '@/lib/imei-order-input';
import { parseServerFieldDefs, validateServerOrderFields } from '@/lib/server-fields';

export const dynamic = 'force-dynamic';

const ALLOWED: PaymentGatewayId[] = ['usdt_portal', 'paypal', 'stripe'];

const schema = z.object({
  kind: z.enum(['imei', 'server']),
  serviceId: z.string().min(1),
  email: z.string().email(),
  gateway: z.enum(ALLOWED as unknown as [PaymentGatewayId, ...PaymentGatewayId[]]),
  data: z.record(z.string(), z.string()).optional().default({}),
});

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function randomPassword() {
  return `Guest-${randomBytes(12).toString('base64url')}`;
}

function displayNameFromEmail(email: string) {
  const local = email.split('@')[0] || 'Guest';
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 48);
}

export async function GET() {
  const gateways = await listEnabledGateways();
  return NextResponse.json({
    ok: true,
    gateways: gateways.filter((g) => g.ready).map((g) => ({ id: g.id, label: g.label })),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid payload' }, { status: 400 });
  }

  const { kind, serviceId, gateway } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();
  const rawData = parsed.data.data ?? {};

  const available = (await listEnabledGateways()).find((g) => g.id === gateway && g.ready);
  if (!available) {
    return NextResponse.json({ ok: false, error: 'Selected gateway is not available' }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    const hashed = await bcrypt.hash(randomPassword(), 12);
    user = await prisma.user.create({
      data: {
        name: displayNameFromEmail(email),
        email,
        password: hashed,
        role: 'USER',
      },
      select: { id: true },
    });
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
  } else {
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, balance: 0 },
    });
  }

  let quotedAmount = 0;
  let payload: Record<string, string> = {};

  if (kind === 'imei') {
    const service = await prisma.imeiService.findFirst({
      where: { id: serviceId, status: ServiceStatus.ACTIVE },
      select: {
        id: true,
        price: true,
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
    if (!service) return NextResponse.json({ ok: false, error: 'Service not found or inactive' }, { status: 404 });

    const normalized = {
      ...rawData,
      serialNumber: rawData.serialNumber ?? rawData.serialNubmer ?? null,
    };
    const imeiParsed = createImeiOrderSchema.safeParse({ serviceId, ...normalized });
    if (!imeiParsed.success) {
      return NextResponse.json({ ok: false, error: imeiParsed.error.issues[0]?.message ?? 'Invalid order data' }, { status: 400 });
    }

    const deviceInput = validateImeiOrderDeviceInput(service, imeiParsed.data);
    if (deviceInput.error) {
      return NextResponse.json({ ok: false, error: deviceInput.error }, { status: 400 });
    }

    const required: Array<{ key: keyof typeof imeiParsed.data; label: string; flag: boolean }> = [
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
      if (r.flag && !`${imeiParsed.data[r.key] ?? ''}`.trim()) {
        return NextResponse.json({ ok: false, error: `Field ${r.label} is required` }, { status: 400 });
      }
    }

    quotedAmount = Number(service.price);
    payload = Object.fromEntries(
      Object.entries(normalized).map(([k, v]) => [k, String(v ?? '')]),
    );
  } else {
    const service = await prisma.serverService.findFirst({
      where: { id: serviceId, status: ServiceStatus.ACTIVE },
      select: { id: true, price: true, requiredFields: true },
    });
    if (!service) return NextResponse.json({ ok: false, error: 'Service not found or inactive' }, { status: 404 });

    const parsedServer = createServerOrderSchema.safeParse({ serviceId, requiredFields: rawData });
    if (!parsedServer.success) {
      return NextResponse.json({ ok: false, error: parsedServer.error.issues[0]?.message ?? 'Invalid order data' }, { status: 400 });
    }

    const fieldDefs = parseServerFieldDefs(service.requiredFields);
    const validation = validateServerOrderFields(fieldDefs, parsedServer.data.requiredFields);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error ?? 'Invalid order fields' }, { status: 400 });
    }

    quotedAmount = Number(service.price);
    payload = validation.fields;
  }

  const token = `chk_${randomBytes(8).toString('hex')}`;
  const reference = `MKT-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  const base = appBaseUrl();
  const successUrl = `${base}/marketplace/checkout/success?token=${token}`;
  const cancelUrl = `${base}/marketplace/checkout/cancel?token=${token}`;

  const checkout = await prisma.marketplaceCheckout.create({
    data: {
      token,
      kind,
      userId: user.id,
      serviceId,
      email,
      gateway,
      quotedAmount,
      payload: JSON.stringify(payload),
      status: 'AWAITING_PAYMENT',
    },
  });

  const intentResult = await createIntent(gateway, {
    userId: user.id,
    amount: quotedAmount,
    reference,
    successUrl,
    cancelUrl,
  });
  if (!intentResult.ok) {
    await prisma.marketplaceCheckout.update({
      where: { id: checkout.id },
      data: {
        status: 'FAILED',
        errorMessage: intentResult.reason,
      },
    });
    return NextResponse.json({ ok: false, error: intentResult.reason }, { status: 400 });
  }

  const intent = await prisma.paymentIntent.findFirst({
    where: { reference, userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, externalUrl: true },
  });

  if (!intent) {
    await prisma.marketplaceCheckout.update({
      where: { id: checkout.id },
      data: {
        status: 'FAILED',
        errorMessage: 'Payment intent not found',
      },
    });
    return NextResponse.json({ ok: false, error: 'Failed to create payment intent' }, { status: 500 });
  }

  await prisma.marketplaceCheckout.update({
    where: { id: checkout.id },
    data: { paymentIntentId: intent.id },
  });

  return NextResponse.json({
    ok: true,
    token,
    payment: intentResult.payload,
    redirectUrl:
      intentResult.payload.kind === 'redirect'
        ? intentResult.payload.url
        : intent.externalUrl,
  });
}

