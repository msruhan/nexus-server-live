import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/api-keys/:id/attempts?limit=50&outcome=REJECTED_IP
 *
 * Returns the most recent attempt log entries for a key. Used by the
 * security panel to show "who tried to use this key from where".
 *
 * Capped to 200 (matches retention) to keep payload bounded.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
  const outcome = url.searchParams.get('outcome');

  const key = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!key) return apiError('API key not found', 404);

  const rows = await prisma.apiKeyAttemptLog.findMany({
    where: { apiKeyId: id, ...(outcome ? { outcome } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      outcome: true,
      reason: true,
      ip: true,
      ipCountry: true,
      userAgent: true,
      action: true,
      createdAt: true,
    },
  });

  return apiSuccess(rows);
}
