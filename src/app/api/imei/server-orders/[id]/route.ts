import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth'
import { maybeAdvanceServerOrderFulfillment } from '@/lib/server-order-stress-fulfillment'

export const dynamic = 'force-dynamic'

/** GET /api/imei/server-orders/[id] — current user's server order detail */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiAuth()
  if (error) return error

  try {
    const { id } = await context.params
    const existing = await prisma.serverOrder.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            description: true,
            requiredFields: true,
            box: { select: { id: true, title: true } },
          },
        },
      },
    })
    if (!existing) return apiError('Order not found', 404)
    if (existing.userId !== session.user.id) {
      return apiError('Access denied', 403)
    }

    const advanced = await maybeAdvanceServerOrderFulfillment(id)
    const order =
      advanced ??
      (await prisma.serverOrder.findUnique({
        where: { id },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              description: true,
              requiredFields: true,
              box: { select: { id: true, title: true } },
            },
          },
        },
      }))
    if (!order) return apiError('Order not found', 404)
    return apiSuccess(order)
  } catch (e) {
    console.error('[SERVER_ORDER_DETAIL_GET]', e)
    return apiError('Failed to fetch orders', 500)
  }
}
