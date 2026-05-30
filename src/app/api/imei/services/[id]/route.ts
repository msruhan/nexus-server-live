import { prisma } from '@/lib/db'
import { apiError, apiSuccess } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/** GET /api/imei/services/[id] — public service detail */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const service = await prisma.imeiService.findFirst({
      where: { id, status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        deliveryTime: true,
        requiresImei: true,
        requiresNetwork: true,
        requiresModel: true,
        requiresProvider: true,
        requiresPin: true,
        requiresKbh: true,
        requiresMep: true,
        requiresPrd: true,
        requiresSn: true,
        group: { select: { id: true, title: true } },
      },
    })
    if (!service) return apiError('Service not found', 404)
    return apiSuccess(service)
  } catch (e) {
    console.error('[IMEI_SERVICE_DETAIL_GET]', e)
    return apiError('Failed to fetch services', 500)
  }
}
