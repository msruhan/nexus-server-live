import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  find: z.string().min(1).max(500),
  replace: z.string().max(500),
});

function replaceInTitle(title: string, find: string, replace: string): string | null {
  if (!title.includes(find)) return null;
  const next = title.split(find).join(replace);
  if (next.trim().length < 2) return null;
  if (next === title) return null;
  return next;
}

/** POST /api/admin/imei/services/bulk-replace-title — find/replace text in service titles */
export async function POST(req: Request) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

    const { find, replace } = parsed.data;
    const ids = [...new Set(parsed.data.ids)];

    const services = await prisma.imeiService.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true },
    });

    const updates: Array<{ id: string; title: string }> = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const service of services) {
      const next = replaceInTitle(service.title, find, replace);
      if (next) {
        updates.push({ id: service.id, title: next });
      } else if (!service.title.includes(find)) {
        skipped.push({ id: service.id, reason: 'Text not found in title' });
      } else {
        skipped.push({ id: service.id, reason: 'Resulting title would be too short' });
      }
    }

    const missingIds = ids.filter((id) => !services.some((s) => s.id === id));
    for (const id of missingIds) {
      skipped.push({ id, reason: 'Service not found' });
    }

    if (updates.length === 0) {
      return apiError('No titles matched the find text.', 409, { skipped });
    }

    await prisma.$transaction(
      updates.map(({ id, title }) =>
        prisma.imeiService.update({ where: { id }, data: { title } }),
      ),
    );

    return apiSuccess({
      updatedCount: updates.length,
      updatedIds: updates.map((u) => u.id),
      skipped,
    });
  } catch (e) {
    console.error('[ADMIN_IMEI_SERVICES_BULK_REPLACE_TITLE]', e);
    return apiError('Bulk replace failed', 500);
  }
}
