import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; overrideId: string }> },
) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id, overrideId } = await ctx.params;
  const row = await prisma.servicePriceOverride.findFirst({
    where: { id: overrideId, priceGroupId: id },
  });
  if (!row) return apiError('Override not found', 404);

  await prisma.servicePriceOverride.delete({ where: { id: overrideId } });
  await logActivity({
    userId: session.user.id,
    action: 'price_group.override_removed',
    entity: 'ServicePriceOverride',
    entityId: overrideId,
    metadata: { priceGroupId: id },
  });
  return apiSuccess({ deleted: true });
}
