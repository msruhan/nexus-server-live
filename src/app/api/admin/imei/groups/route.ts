import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { createImeiServiceGroupSchema } from '@/lib/validations/imei'

export const dynamic = 'force-dynamic'

/** GET /api/admin/imei/groups — list all service groups */
export async function GET() {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const groups = await prisma.imeiServiceGroup.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: {
        _count: { select: { services: true } },
      },
    })
    return apiSuccess(groups)
  } catch (e) {
    console.error('[ADMIN_IMEI_GROUPS_GET]', e)
    return apiError('Failed to fetch data group', 500)
  }
}

/** POST /api/admin/imei/groups — create a new service group */
export async function POST(req: Request) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const body = await req.json()
    const parsed = createImeiServiceGroupSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    const created = await prisma.imeiServiceGroup.create({ data: parsed.data })
    return apiSuccess(created, 201)
  } catch (e) {
    console.error('[ADMIN_IMEI_GROUPS_POST]', e)
    return apiError('Failed to create group', 500)
  }
}
