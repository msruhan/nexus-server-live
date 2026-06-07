import { prisma } from '@/lib/db'
import { apiError, apiSuccess } from '@/lib/api-auth'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/imei/services — public list of active services for users.
 * Supports search (q) and group filter.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    const groupId = searchParams.get('groupId')

    const where: Prisma.ImeiServiceWhereInput = { status: 'ACTIVE' }
    if (groupId) where.groupId = groupId
    if (q && q.trim()) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { group: { title: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const [services, groups] = await Promise.all([
      prisma.imeiService.findMany({
        where,
        orderBy: [{ group: { sortOrder: 'asc' } }, { price: 'asc' }],
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
          requiresEcid: true,
          group: { select: { id: true, title: true } },
        },
      }),
      prisma.imeiServiceGroup.findMany({
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        select: {
          id: true,
          title: true,
          _count: { select: { services: { where: { status: 'ACTIVE' } } } },
        },
      }),
    ])

    return apiSuccess({ services, groups })
  } catch (e) {
    console.error('[IMEI_SERVICES_GET]', e)
    return apiError('Failed to fetch services IMEI', 500)
  }
}
