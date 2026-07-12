import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { listResolvedServicePricesForUser } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      priceGroup: { select: { name: true } },
    },
  });
  if (!user) return apiError('User not found', 404);

  const pricing = await listResolvedServicePricesForUser(id);
  const adjustedCount = pricing.rows.filter((r) => r.adjusted).length;

  return apiSuccess({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      groupName: user.priceGroup?.name ?? pricing.groupName ?? 'Retail',
    },
    adjustedCount,
    rows: pricing.rows,
  });
}
