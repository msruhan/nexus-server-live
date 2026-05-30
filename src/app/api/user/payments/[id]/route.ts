import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireApiAuth();
  if (error) return error;

  const { id } = await ctx.params;
  const intent = await prisma.paymentIntent.findFirst({
    where: { id, userId: session.user.id },
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
  });
  if (!intent) return apiError('Intent not found', 404);
  return apiSuccess({ ...intent, amount: intent.amount.toString() });
}
