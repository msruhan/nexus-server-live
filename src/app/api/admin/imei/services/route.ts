import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { createImeiServiceSchema } from '@/lib/validations/imei'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/** GET /api/admin/imei/services — list services with filtering */
export async function GET(req: Request) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('groupId')
    const apiId = searchParams.get('apiId')
    const status = searchParams.get('status') as 'ACTIVE' | 'INACTIVE' | null
    const q = searchParams.get('q')

    const where: Prisma.ImeiServiceWhereInput = {}
    if (groupId) where.groupId = groupId
    if (apiId) where.apiId = apiId
    if (status === 'ACTIVE' || status === 'INACTIVE') where.status = status
    if (q && q.trim()) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }

    const services = await prisma.imeiService.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        group: { select: { id: true, title: true } },
        api: { select: { id: true, title: true } },
      },
    })
    return apiSuccess(services)
  } catch (e) {
    console.error('[ADMIN_IMEI_SERVICES_GET]', e)
    return apiError('Failed to fetch data service', 500)
  }
}

/** POST /api/admin/imei/services — create a new service */
export async function POST(req: Request) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const body = await req.json()
    const parsed = createImeiServiceSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    // Verify FK integrity
    const [api, group] = await Promise.all([
      prisma.imeiApi.findUnique({ where: { id: parsed.data.apiId } }),
      prisma.imeiServiceGroup.findUnique({ where: { id: parsed.data.groupId } }),
    ])
    if (!api) return apiError('API provider not found', 404)
    if (!group) return apiError('Service group not found', 404)

    const created = await prisma.imeiService.create({
      data: parsed.data,
      include: {
        group: { select: { id: true, title: true } },
        api: { select: { id: true, title: true } },
      },
    })
    return apiSuccess(created, 201)
  } catch (e) {
    console.error('[ADMIN_IMEI_SERVICES_POST]', e)
    return apiError('Failed to create service', 500)
  }
}
