import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/** GET /api/admin/imei/server-orders */
export async function GET(req: Request) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const q = searchParams.get('q')

    const where: Prisma.ServerOrderWhereInput = {}
    if (status && ['PENDING', 'IN_PROCESS', 'SUCCESS', 'REJECTED', 'CANCELLED'].includes(status)) {
      where.status = status as Prisma.ServerOrderWhereInput['status']
    }
    if (q?.trim()) {
      where.OR = [
        { orderCode: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { service: { title: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const [orders, stats] = await Promise.all([
      prisma.serverOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          user: { select: { id: true, name: true, email: true } },
          service: {
            select: {
              id: true,
              title: true,
              requiredFields: true,
              box: { select: { title: true } },
            },
          },
        },
      }),
      prisma.serverOrder.groupBy({ by: ['status'], _count: { _all: true } }),
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
      },
    })
  } catch (e) {
    console.error('[ADMIN_SERVER_ORDERS_GET]', e)
    return apiError('Failed to fetch data', 500)
  }
}
