import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-auth';
import { requireApiKeyAuth } from '@/lib/api-key-auth';
import { scheduleImeiOrderFollowUp } from '@/lib/imei-order-scheduler';
import { pollImeiOrderFromSupplier, submitImeiOrderToSupplier } from '@/lib/imei-order-worker';
import { createImeiOrderSchema } from '@/lib/validations/imei';
import {
  deviceFieldLabel,
  findActiveDeviceDuplicate,
  formatDuplicateWarning,
} from '@/lib/imei-order-duplicate';
import { validateImeiOrderDeviceInput } from '@/lib/imei-order-input';
import { generateOrderCode } from '@/lib/generate-order-code';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireApiKeyAuth(req, 'orders:write');
  if (!auth.ok) return auth.error;

  try {
    const rawBody = await req.json();
    const body = {
      ...rawBody,
      // Backward-compat for typo key from older clients.
      serialNumber: rawBody?.serialNumber ?? rawBody?.serialNubmer ?? null,
    };
    const parsed = createImeiOrderSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const userId = auth.user.id;

    const service = await prisma.imeiService.findFirst({
      where: { id: parsed.data.serviceId, status: 'ACTIVE' },
      select: {
        id: true,
        apiId: true,
        price: true,
        title: true,
        requiresImei: true,
        requiresNetwork: true,
        requiresModel: true,
        requiresProvider: true,
        requiresPin: true,
        requiresKbh: true,
        requiresMep: true,
        requiresPrd: true,
        requiresSn: true,
      },
    });
    if (!service) return apiError('Service not found or inactive', 404);

    const deviceInput = validateImeiOrderDeviceInput(service, parsed.data);
    if (deviceInput.error) return apiError(deviceInput.error);

    const deviceLabel = deviceFieldLabel(service.requiresImei, service.requiresSn);
    const duplicate = await findActiveDeviceDuplicate({
      apiId: service.apiId,
      serviceId: service.id,
      deviceKey: deviceInput.imei,
    });
    if (duplicate && !parsed.data.acknowledgeDuplicate) {
      return apiError(formatDuplicateWarning(duplicate, deviceLabel), 409, {
        code: 'DUPLICATE_ORDER',
        duplicate,
      });
    }

    const required: { key: keyof typeof parsed.data; label: string; flag: boolean }[] = [
      { key: 'network', label: 'Network', flag: service.requiresNetwork },
      { key: 'model', label: 'Model', flag: service.requiresModel },
      { key: 'provider', label: 'Provider', flag: service.requiresProvider },
      { key: 'pin', label: 'PIN', flag: service.requiresPin },
      { key: 'kbh', label: 'KBH', flag: service.requiresKbh },
      { key: 'mep', label: 'MEP', flag: service.requiresMep },
      { key: 'prd', label: 'PRD', flag: service.requiresPrd },
      { key: 'serialNumber', label: 'Serial Number', flag: service.requiresSn },
    ];
    for (const r of required) {
      if (r.flag && (!parsed.data[r.key] || `${parsed.data[r.key]}`.trim() === '')) {
        return apiError(`Field ${r.label} is required`);
      }
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return apiError('Wallet not found', 400);

    // Tiered pricing — see /api/imei/orders for the rationale. This is the
    // reseller-facing public/v1 endpoint; the user is the API key owner.
    const { resolveServicePriceForUser } = await import('@/lib/pricing');
    const resolved = await resolveServicePriceForUser({
      userId,
      serviceId: service.id,
      kind: 'imei',
      basePrice: service.price,
    });
    const effectivePrice = resolved.price as typeof service.price;

    if (wallet.balance.lessThan(effectivePrice)) {
      return apiError('Insufficient balance. Please top up first.', 402);
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
          serviceId: service.id,
          imei: deviceInput.imei,
          price: effectivePrice,
          status: 'PENDING',
          network: parsed.data.network ?? null,
          model: parsed.data.model ?? null,
          provider: parsed.data.provider ?? null,
          pin: parsed.data.pin ?? null,
          kbh: parsed.data.kbh ?? null,
          mep: parsed.data.mep ?? null,
          prd: parsed.data.prd ?? null,
          serialNumber: deviceInput.serialNumber,
          note: parsed.data.note ?? null,
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
              ? `Order IMEI ${service.title} (public API)`
              : `Order IMEI ${service.title} (public API, tier: ${resolved.groupName ?? '-'})`,
          referenceId: created.id,
        },
      });
      return created;
    });

    try {
      const submitted = await submitImeiOrderToSupplier(order.id);
      if (submitted.ok && submitted.referenceId) {
        void pollImeiOrderFromSupplier(order.id).catch((e) =>
          console.error('[PUBLIC_V1_IMEI_ORDERS_POLL_AFTER_SUBMIT]', e),
        );
      }
      scheduleImeiOrderFollowUp(order.id);
    } catch (submitErr) {
      console.error('[PUBLIC_V1_IMEI_ORDERS_SUBMIT_SUPPLIER]', submitErr);
    }

    return apiSuccess(
      {
        id: order.id,
        orderCode: order.orderCode,
        status: order.status,
        referenceId: order.referenceId,
      },
      201,
    );
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') {
      return apiError('Insufficient balance. Please top up first.', 402);
    }
    console.error('[PUBLIC_V1_IMEI_ORDERS_POST]', e);
    return apiError('Failed to create order', 500);
  }
}
