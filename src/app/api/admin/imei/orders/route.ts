import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/** GET /api/admin/imei/orders — list orders with filtering */
export async function GET(req: Request) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const q = searchParams.get('q')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 500)

    const where: Prisma.ImeiOrderWhereInput = {}
    if (status && ['PENDING', 'IN_PROCESS', 'SUCCESS', 'REJECTED', 'CANCELLED'].includes(status)) {
      where.status = status as Prisma.ImeiOrderWhereInput['status']
    }
    if (userId) where.userId = userId
    if (q && q.trim()) {
      where.OR = [
        { imei: { contains: q } },
        { orderCode: { contains: q, mode: 'insensitive' } },
        { service: { title: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
      ]
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const [orders, stats] = await Promise.all([
      prisma.imeiOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          service: {
            select: {
              id: true,
              title: true,
              group: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.imeiOrder.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ])

    const statusCounts = stats.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = s._count._all
      return acc
    }, {})

    return apiSuccess({
      orders,
      stats: {
        total: orders.length,
        pending: statusCounts.PENDING ?? 0,
        inProcess: statusCounts.IN_PROCESS ?? 0,
        success: statusCounts.SUCCESS ?? 0,
        rejected: statusCounts.REJECTED ?? 0,
        cancelled: statusCounts.CANCELLED ?? 0,
      },
    })
  } catch (e) {
    console.error('[ADMIN_IMEI_ORDERS_GET]', e)
    return apiError('Failed to fetch data order', 500)
  }
}
