import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const schema = z.object({
  priceGroupId: z.string().cuid().nullable(),
});

/**
 * Assign or detach a user's price group. Used by the admin Users page.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  if (parsed.data.priceGroupId) {
    const exists = await prisma.priceGroup.findUnique({ where: { id: parsed.data.priceGroupId } });
    if (!exists) return apiError('Price group not found', 404);
  }

  await prisma.user.update({
    where: { id },
    data: { priceGroupId: parsed.data.priceGroupId },
  });

  await logActivity({
    userId: session.user.id,
    action: 'user.price_group_changed',
    entity: 'User',
    entityId: id,
    metadata: { priceGroupId: parsed.data.priceGroupId },
  });
  return apiSuccess({ updated: true });
}
