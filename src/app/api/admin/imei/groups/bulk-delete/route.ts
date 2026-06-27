import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

/** POST /api/admin/imei/groups/bulk-delete */
export async function POST(req: Request) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

    const ids = [...new Set(parsed.data.ids)];

    const serviceCounts = await prisma.imeiService.groupBy({
      by: ['groupId'],
      where: { groupId: { in: ids } },
      _count: { _all: true },
    });

    const blocked = new Map(
      serviceCounts.map((row) => [row.groupId, row._count._all] as const),
    );

    const deletable = ids.filter((id) => !blocked.has(id));
    const skipped = ids
      .filter((id) => blocked.has(id))
      .map((id) => ({
        id,
        reason: `${blocked.get(id)} service(s) still linked`,
      }));

    if (deletable.length === 0) {
      return apiError('No selected groups can be deleted (all have linked services).', 409, {
        skipped,
      });
    }

    const result = await prisma.imeiServiceGroup.deleteMany({
      where: { id: { in: deletable } },
    });

    return apiSuccess({
      deletedCount: result.count,
      deletedIds: deletable,
      skipped,
    });
  } catch (e) {
    console.error('[ADMIN_IMEI_GROUPS_BULK_DELETE]', e);
    return apiError('Bulk delete failed', 500);
  }
}
