import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { updateImeiServiceSchema } from '@/lib/validations/imei'
import { postNewService, postPriceUpdate } from '@/lib/telegram/channel'

export const dynamic = 'force-dynamic'

/** GET /api/admin/imei/services/[id] — get one service */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const service = await prisma.imeiService.findUnique({
      where: { id },
      include: {
        group: true,
        api: true,
      },
    })
    if (!service) return apiError('Service not found', 404)
    return apiSuccess(service)
  } catch (e) {
    console.error('[ADMIN_IMEI_SERVICE_GET]', e)
    return apiError('Failed to fetch service', 500)
  }
}

/** PATCH /api/admin/imei/services/[id] — update a service */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const body = await req.json()
    const parsed = updateImeiServiceSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    // Fetch before state for channel auto-post detection
    const before = await prisma.imeiService.findUnique({
      where: { id },
      select: { title: true, price: true, status: true, group: { select: { title: true } } },
    })

    const updated = await prisma.imeiService.update({
      where: { id },
      data: parsed.data,
      include: {
        group: { select: { id: true, title: true } },
        api: { select: { id: true, title: true } },
      },
    })

    // Fire-and-forget channel auto-posts
    if (before) {
      const newStatus = (parsed.data as Record<string, unknown>).status as string | undefined ?? before.status
      const newPrice = (parsed.data as Record<string, unknown>).price as number | undefined ?? Number(before.price)
      const title = (parsed.data as Record<string, unknown>).title as string | undefined ?? before.title

      if ((parsed.data as Record<string, unknown>).status === 'ACTIVE' && before.status !== 'ACTIVE') {
        void postNewService({ title, category: before.group?.title ?? 'IMEI', price: newPrice })
      }
      if ((parsed.data as Record<string, unknown>).price !== undefined && Number(before.price) !== newPrice && newStatus === 'ACTIVE') {
        void postPriceUpdate({ title, oldPrice: Number(before.price), newPrice })
      }
    }

    return apiSuccess(updated)
  } catch (e) {
    console.error('[ADMIN_IMEI_SERVICE_PATCH]', e)
    return apiError('Failed to update service', 500)
  }
}

/** DELETE /api/admin/imei/services/[id] — delete a service */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const ordersCount = await prisma.imeiOrder.count({ where: { serviceId: id } })
    if (ordersCount > 0) {
      return apiError(
        `${ordersCount} order(s) still linked. Disable this service instead of deleting it.`,
        409,
      )
    }
    await prisma.imeiService.delete({ where: { id } })
    return apiSuccess({ id })
  } catch (e) {
    console.error('[ADMIN_IMEI_SERVICE_DELETE]', e)
    return apiError('Failed to delete service', 500)
  }
}
