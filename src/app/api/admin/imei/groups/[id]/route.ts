import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { updateImeiServiceGroupSchema } from '@/lib/validations/imei'

export const dynamic = 'force-dynamic'

/** GET /api/admin/imei/groups/[id] — get one service group */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const group = await prisma.imeiServiceGroup.findUnique({
      where: { id },
      include: {
        services: { orderBy: { title: 'asc' } },
      },
    })
    if (!group) return apiError('Group not found', 404)
    return apiSuccess(group)
  } catch (e) {
    console.error('[ADMIN_IMEI_GROUP_GET]', e)
    return apiError('Failed to fetch group', 500)
  }
}

/** PATCH /api/admin/imei/groups/[id] — update a service group */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const body = await req.json()
    const parsed = updateImeiServiceGroupSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    const updated = await prisma.imeiServiceGroup.update({
      where: { id },
      data: parsed.data,
    })
    return apiSuccess(updated)
  } catch (e) {
    console.error('[ADMIN_IMEI_GROUP_PATCH]', e)
    return apiError('Failed to update group', 500)
  }
}

/** DELETE /api/admin/imei/groups/[id] — delete a service group */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const servicesCount = await prisma.imeiService.count({ where: { groupId: id } })
    if (servicesCount > 0) {
      return apiError(
        `${servicesCount} service(s) still linked to this group. Delete or move them first.`,
        409,
      )
    }
    await prisma.imeiServiceGroup.delete({ where: { id } })
    return apiSuccess({ id })
  } catch (e) {
    console.error('[ADMIN_IMEI_GROUP_DELETE]', e)
    return apiError('Failed to delete group', 500)
  }
}
