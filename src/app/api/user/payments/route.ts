import { z } from 'zod';
import { randomBytes } from 'crypto';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import { createIntent, listEnabledGateways } from '@/lib/payment/registry';
import type { PaymentGatewayId } from '@/lib/payment/types';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ALLOWED: PaymentGatewayId[] = ['usdt_portal', 'paypal', 'stripe'];

const createSchema = z.object({
  gateway: z.enum(ALLOWED as unknown as [PaymentGatewayId, ...PaymentGatewayId[]]),
  amount: z.number().min(1).max(50000), // USD sanity bounds
});

export async function GET() {
  const { error, session } = await requireApiAuth();
  if (error) return error;

  const [gateways, intents] = await Promise.all([
    listEnabledGateways(),
    prisma.paymentIntent.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        reference: true,
        gateway: true,
        amount: true,
        cryptoAsset: true,
        cryptoAmount: true,
        cryptoAddress: true,
        status: true,
        txHash: true,
        expiresAt: true,
        confirmedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return apiSuccess({
    gateways,
    intents: intents.map((i) => ({
      ...i,
      amount: i.amount.toString(),
    })),
  });
}

export async function POST(req: Request) {
  const { error, session } = await requireApiAuth();
  if (error) return error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  const reference = `PAY-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  const result = await createIntent(parsed.data.gateway, {
    userId: session.user.id,
    amount: parsed.data.amount,
    reference,
  });
  if (!result.ok) return apiError(result.reason, 400);

  // Re-read the just-created intent to return its id (USDT path also wants to surface address).
  const intent = await prisma.paymentIntent.findFirst({
    where: { reference, userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      reference: true,
      gateway: true,
      amount: true,
      cryptoAsset: true,
      cryptoAmount: true,
      cryptoAddress: true,
      expiresAt: true,
    },
  });

  return apiSuccess(
    {
      payload: result.payload,
      intent: intent
        ? {
            ...intent,
            amount: intent.amount.toString(),
          }
        : null,
    },
    201,
  );
}
