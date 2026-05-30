import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  category: z.string().trim().min(1).max(64).optional(),
  version: z.string().trim().max(64).optional().nullable(),
  platform: z.string().trim().max(64).optional().nullable(),
  downloadUrl: z.string().url().max(2000).optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  try {
    const updated = await prisma.downloadTool.update({
      where: { id },
      data: parsed.data,
    });
    await logActivity({
      userId: session.user.id,
      action: 'download_tool.updated',
      entity: 'DownloadTool',
      entityId: id,
      metadata: { changed: Object.keys(parsed.data) },
    });
    return apiSuccess(updated);
  } catch (e) {
    console.error('[ADMIN_DOWNLOAD_TOOL_PATCH]', e);
    return apiError('Failed to update tool', 500);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  try {
    await prisma.downloadTool.delete({ where: { id } });
    await logActivity({
      userId: session.user.id,
      action: 'download_tool.deleted',
      entity: 'DownloadTool',
      entityId: id,
    });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('[ADMIN_DOWNLOAD_TOOL_DELETE]', e);
    return apiError('Failed to delete tool', 500);
  }
}
