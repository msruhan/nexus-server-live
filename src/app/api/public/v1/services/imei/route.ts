import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-auth';
import { requireApiKeyAuth } from '@/lib/api-key-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireApiKeyAuth(req, 'services:read');
  if (!auth.ok) return auth.error;

  try {
    const rows = await prisma.imeiService.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ group: { sortOrder: 'asc' } }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        deliveryTime: true,
        group: { select: { id: true, title: true } },
      },
    });
    return apiSuccess(rows);
  } catch (e) {
    console.error('[PUBLIC_V1_SERVICES_IMEI_GET]', e);
    return apiError('Failed to load services', 500);
  }
}
