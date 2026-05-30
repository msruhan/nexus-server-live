import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  category: z.string().trim().min(1).max(64).default('general'),
  version: z.string().trim().max(64).optional().nullable(),
  platform: z.string().trim().max(64).optional().nullable(),
  downloadUrl: z.string().url().max(2000),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const items = await prisma.downloadTool.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
  return apiSuccess(items);
}

export async function POST(req: Request) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  try {
    const last = await prisma.downloadTool.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const created = await prisma.downloadTool.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        category: parsed.data.category,
        version: parsed.data.version ?? null,
        platform: parsed.data.platform ?? null,
        downloadUrl: parsed.data.downloadUrl,
        isPublished: parsed.data.isPublished ?? false,
        sortOrder: parsed.data.sortOrder ?? (last?.sortOrder ?? 0) + 10,
      },
    });
    await logActivity({
      userId: session.user.id,
      action: 'download_tool.created',
      entity: 'DownloadTool',
      entityId: created.id,
      metadata: { title: created.title },
    });
    return apiSuccess(created, 201);
  } catch (e) {
    console.error('[ADMIN_DOWNLOAD_TOOLS_POST]', e);
    return apiError('Failed to create tool', 500);
  }
}
