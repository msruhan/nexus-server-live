import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateOrderCode } from '@/lib/generate-order-code';
import { validateImeiOrderDeviceInput } from '@/lib/imei-order-input';
import { parseServerFieldDefs, validateServerOrderFields } from '@/lib/server-fields';
import { scheduleImeiOrderFollowUp } from '@/lib/imei-order-scheduler';
import { scheduleServerOrderFollowUp } from '@/lib/server-order-scheduler';
import { pollImeiOrderFromSupplier, submitImeiOrderToSupplier } from '@/lib/imei-order-worker';
import { pollServerOrderFromSupplier, submitServerOrderToSupplier } from '@/lib/server-order-worker';

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

export async function finalizeMarketplaceCheckoutByIntent(intentId: string): Promise<void> {
  const checkout = await prisma.marketplaceCheckout.findFirst({
    where: {
      paymentIntentId: intentId,
      status: { in: ['AWAITING_PAYMENT', 'PROCESSING'] },
    },
    include: {
      paymentIntent: true,
    },
  });
  if (!checkout || !checkout.paymentIntent) return;
  if (checkout.status === 'COMPLETED') return;
  if (checkout.paymentIntent.status !== 'CONFIRMED') return;

  // Opportunistic lock by marking as processing.
  if (checkout.status === 'AWAITING_PAYMENT') {
    await prisma.marketplaceCheckout.updateMany({
      where: { id: checkout.id, status: 'AWAITING_PAYMENT' },
      data: { status: 'PROCESSING' },
    });
  }

  const payload = safeJsonParse(checkout.payload);
  const effectivePrice = new Prisma.Decimal(checkout.quotedAmount);

  if (checkout.kind === 'imei') {
    const service = await prisma.imeiService.findFirst({
      where: { id: checkout.serviceId, status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        apiId: true,
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
    if (!service) {
      await prisma.marketplaceCheckout.update({
        where: { id: checkout.id },
        data: { status: 'FAILED', errorMessage: 'Service not found or inactive' },
      });
      return;
    }

    const deviceInput = validateImeiOrderDeviceInput(service, payload);
    if (deviceInput.error) {
      await prisma.marketplaceCheckout.update({
        where: { id: checkout.id },
        data: { status: 'FAILED', errorMessage: deviceInput.error },
      });
      return;
    }

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
        await prisma.marketplaceCheckout.update({
          where: { id: checkout.id },
          data: { status: 'FAILED', errorMessage: `Field ${r.label} is required` },
        });
        return;
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: checkout.userId },
        update: {},
        create: { userId: checkout.userId, balance: 0 },
      });
      if (wallet.balance.lessThan(effectivePrice)) {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      const newBalance = wallet.balance.sub(effectivePrice);
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });

      const created = await tx.imeiOrder.create({
        data: {
          orderCode: generateOrderCode(),
          userId: checkout.userId,
          serviceId: service.id,
          imei: deviceInput.imei,
          price: effectivePrice,
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
        },
      });

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          type: 'PAYMENT',
          amount: effectivePrice.neg(),
          balance: newBalance,
          description: `Marketplace IMEI order: ${service.title}`,
          referenceId: created.id,
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
      // No-op: order exists and will be picked up by scheduler retries.
    }
    return;
  }

  const service = await prisma.serverService.findFirst({
    where: { id: checkout.serviceId, status: 'ACTIVE' },
    select: {
      id: true,
      title: true,
      requiredFields: true,
    },
  });
  if (!service) {
    await prisma.marketplaceCheckout.update({
      where: { id: checkout.id },
      data: { status: 'FAILED', errorMessage: 'Service not found or inactive' },
    });
    return;
  }

  const fieldDefs = parseServerFieldDefs(service.requiredFields);
  const validation = validateServerOrderFields(fieldDefs, payload);
  if (!validation.ok) {
    await prisma.marketplaceCheckout.update({
      where: { id: checkout.id },
      data: { status: 'FAILED', errorMessage: validation.error ?? 'Invalid order fields' },
    });
    return;
  }

  const order = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId: checkout.userId },
      update: {},
      create: { userId: checkout.userId, balance: 0 },
    });
    if (wallet.balance.lessThan(effectivePrice)) {
      throw new Error('INSUFFICIENT_BALANCE');
    }
    const newBalance = wallet.balance.sub(effectivePrice);
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });

    const created = await tx.serverOrder.create({
      data: {
        orderCode: generateOrderCode(),
        userId: checkout.userId,
        serviceId: service.id,
        price: effectivePrice,
        status: 'PENDING',
        email: validation.email || checkout.email,
        notes: validation.notes,
        requiredFields:
          Object.keys(validation.fields).length > 0 ? JSON.stringify(validation.fields) : null,
      },
    });

    await tx.walletLedger.create({
      data: {
        walletId: wallet.id,
        type: 'PAYMENT',
        amount: effectivePrice.neg(),
        balance: newBalance,
        description: `Marketplace server order: ${service.title}`,
        referenceId: created.id,
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
    // No-op: order exists and will be picked up by scheduler retries.
  }
}

