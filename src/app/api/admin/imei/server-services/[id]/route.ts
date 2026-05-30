import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import {
  resolveRequiredFieldsFromUpdate,
  updateServerServiceSchema,
} from '@/lib/validations/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error
  try {
    const { id } = await context.params
    const service = await prisma.serverService.findUnique({
      where: { id },
      include: { box: true, api: true },
    })
    if (!service) return apiError('Service not found', 404)
    return apiSuccess(service)
  } catch (e) {
    console.error('[ADMIN_SERVER_SERVICE_GET]', e)
    return apiError('Failed to fetch data', 500)
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error
  try {
    const { id } = await context.params
    const body = await req.json()
    const parsed = updateServerServiceSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    const { fieldDefs: _fd, requiredFields: _rf, ...rest } = parsed.data
    const fieldUpdate = resolveRequiredFieldsFromUpdate(parsed.data)

    const updated = await prisma.serverService.update({
      where: { id },
      data: { ...rest, ...fieldUpdate },
      include: { box: { select: { id: true, title: true } }, api: { select: { id: true, title: true } } },
    })
    return apiSuccess(updated)
  } catch (e) {
    console.error('[ADMIN_SERVER_SERVICE_PATCH]', e)
    return apiError('Failed to update', 500)
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error
  try {
    const { id } = await context.params
    const count = await prisma.serverOrder.count({ where: { serviceId: id } })
    if (count > 0) return apiError(`${count} order still linked. Disable it instead.`, 409)
    await prisma.serverService.delete({ where: { id } })
    return apiSuccess({ id })
  } catch (e) {
    console.error('[ADMIN_SERVER_SERVICE_DELETE]', e)
    return apiError('Failed to delete', 500)
  }
}
