import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-auth';
import { requireApiKeyAuth } from '@/lib/api-key-auth';
import { scheduleServerOrderFollowUp } from '@/lib/server-order-scheduler';
import { pollServerOrderFromSupplier, submitServerOrderToSupplier } from '@/lib/server-order-worker';
import { parseServerFieldDefs, validateServerOrderFields } from '@/lib/server-fields';
import { createServerOrderSchema } from '@/lib/validations/server';
import { generateOrderCode } from '@/lib/generate-order-code';
import { extractFeedbackInput } from '@/lib/feedback/input';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireApiKeyAuth(req, 'orders:write');
  if (!auth.ok) return auth.error;

  try {
    const body = await req.json();
    const parsed = createServerOrderSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    // Optional Dhru-compatible callback inputs (SSRF-validated, additive).
    const feedback = extractFeedbackInput(body);

    const userId = auth.user.id;

    const service = await prisma.serverService.findFirst({ where: { id: parsed.data.serviceId } });
    if (!service) return apiError('Service not found', 404);
    if (service.status !== 'ACTIVE') return apiError('Service is not active', 400);

    const fieldDefs = parseServerFieldDefs(service.requiredFields);
    const validation = validateServerOrderFields(fieldDefs, parsed.data.requiredFields);
    if (!validation.ok) return apiError(validation.error ?? 'Invalid order data', 400);

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return apiError('Wallet not found', 400);

    // Tiered pricing — see /api/imei/orders for rationale.
    const { resolveServicePriceForUser } = await import('@/lib/pricing');
    const resolved = await resolveServicePriceForUser({
      userId,
      serviceId: service.id,
      kind: 'server',
      basePrice: service.price,
    });
    const effectivePrice = resolved.price as typeof service.price;

    if (wallet.balance.lessThan(effectivePrice)) return apiError('Insufficient balance', 402);

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
          serviceId: service.id,
          price: effectivePrice,
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
              ? `Server order: ${service.title} (public API)`
              : `Server order: ${service.title} (public API, tier: ${resolved.groupName ?? '-'})`,
          referenceId: created.id,
        },
      });
      return created;
    });

    try {
      const submitted = await submitServerOrderToSupplier(order.id);
      if (submitted.ok && submitted.referenceId) {
        void pollServerOrderFromSupplier(order.id).catch((e) =>
          console.error('[PUBLIC_V1_SERVER_ORDERS_POLL_AFTER_SUBMIT]', e),
        );
      }
      scheduleServerOrderFollowUp(order.id);
    } catch (submitErr) {
      console.error('[PUBLIC_V1_SERVER_ORDERS_SUBMIT_SUPPLIER]', submitErr);
    }

    return apiSuccess(
      {
        id: order.id,
        orderCode: order.orderCode,
        status: order.status,
        referenceId: order.referenceId,
        reference_id: feedback.callerReference ?? undefined,
      },
      201,
    );
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') {
      return apiError('Insufficient balance', 402);
    }
    console.error('[PUBLIC_V1_SERVER_ORDERS_POST]', e);
    return apiError('Failed to create order', 500);
  }
}
