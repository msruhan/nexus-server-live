import { prisma } from '@/lib/db'
import { apiError, apiSuccess } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/** GET /api/imei/server-services — public list of active server services */
export async function GET() {
  try {
    const [services, boxes] = await Promise.all([
      prisma.serverService.findMany({
        where: { status: 'ACTIVE' },
        orderBy: [{ box: { sortOrder: 'asc' } }, { price: 'asc' }],
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          deliveryTime: true,
          requiredFields: true,
          box: { select: { id: true, title: true } },
        },
      }),
      prisma.serverServiceBox.findMany({
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        select: { id: true, title: true, _count: { select: { services: { where: { status: 'ACTIVE' } } } } },
      }),
    ])
    return apiSuccess({ services, boxes })
  } catch (e) {
    console.error('[SERVER_SERVICES_GET]', e)
    return apiError('Failed to fetch services', 500)
  }
}
