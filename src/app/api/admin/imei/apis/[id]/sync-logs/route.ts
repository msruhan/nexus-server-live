import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await context.params;
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));

  const logs = await prisma.supplierSyncLog.findMany({
    where: { apiId: id },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });

  return apiSuccess({ logs });
}
