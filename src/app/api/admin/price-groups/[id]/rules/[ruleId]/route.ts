import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; ruleId: string }> },
) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id, ruleId } = await ctx.params;
  const row = await prisma.priceGroupRule.findFirst({
    where: { id: ruleId, priceGroupId: id },
  });
  if (!row) return apiError('Rule not found', 404);

  await prisma.priceGroupRule.delete({ where: { id: ruleId } });
  await logActivity({
    userId: session.user.id,
    action: 'price_group.rule_removed',
    entity: 'PriceGroupRule',
    entityId: ruleId,
    metadata: { priceGroupId: id, scope: row.scope, kind: row.kind },
  });

  return apiSuccess({ deleted: true });
}
