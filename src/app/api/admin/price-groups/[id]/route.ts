import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().trim().min(2).max(64).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  defaultEnabled: z.boolean().optional(),
  adjustmentType: z.enum(['PERCENT', 'FIXED']).optional(),
  discountPercent: z.number().min(0).max(50).optional(),
  fixedAdjustment: z.number().min(-100000).max(100000).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  try {
    const data = { ...parsed.data };
    if (data.adjustmentType === 'PERCENT') {
      data.fixedAdjustment = 0;
    } else if (data.adjustmentType === 'FIXED') {
      data.discountPercent = 0;
    }
    const updated = await prisma.priceGroup.update({
      where: { id },
      data,
    });
    await logActivity({
      userId: session.user.id,
      action: 'price_group.updated',
      entity: 'PriceGroup',
      entityId: id,
      metadata: { changed: Object.keys(parsed.data) },
    });
    return apiSuccess(updated);
  } catch (e) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return apiError('A group with that name already exists.', 409);
    }
    console.error('[ADMIN_PRICE_GROUPS_PATCH]', e);
    return apiError('Failed to update group', 500);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  try {
    // Detach users (User.priceGroupId is SetNull on delete via schema relation,
    // but we explicitly null first for clarity & to log the count).
    const detached = await prisma.user.updateMany({
      where: { priceGroupId: id },
      data: { priceGroupId: null },
    });
    await prisma.priceGroup.delete({ where: { id } });
    await logActivity({
      userId: session.user.id,
      action: 'price_group.deleted',
      entity: 'PriceGroup',
      entityId: id,
      metadata: { detachedUsers: detached.count },
    });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('[ADMIN_PRICE_GROUPS_DELETE]', e);
    return apiError('Failed to delete group', 500);
  }
}
