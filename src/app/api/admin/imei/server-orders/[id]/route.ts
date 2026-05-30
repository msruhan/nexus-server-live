import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { z } from 'zod'
import { ServerOrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const FINAL_SERVER_ORDER_STATUSES: ServerOrderStatus[] = [
  ServerOrderStatus.SUCCESS,
  ServerOrderStatus.REJECTED,
  ServerOrderStatus.CANCELLED,
]

const updateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROCESS', 'SUCCESS', 'REJECTED', 'CANCELLED']).optional(),
  code: z.string().max(5000).optional().nullable(),
  comments: z.string().max(2000).optional().nullable(),
})

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error
  try {
    const { id } = await context.params
    const order = await prisma.serverOrder.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { include: { box: true, api: { select: { id: true, title: true } } } },
      },
    })
    if (!order) return apiError('Order not found', 404)
    return apiSuccess(order)
  } catch (e) {
    console.error('[ADMIN_SERVER_ORDER_GET]', e)
    return apiError('Failed to fetch data', 500)
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error
  try {
    const { id } = await context.params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    const existing = await prisma.serverOrder.findUnique({ where: { id } })
    if (!existing) return apiError('Order not found', 404)

    const data: Parameters<typeof prisma.serverOrder.update>[0]['data'] = { ...parsed.data }
    const newStatus = parsed.data.status

    if (newStatus === ServerOrderStatus.IN_PROCESS && !existing.processedAt) data.processedAt = new Date()
    if ((newStatus === ServerOrderStatus.SUCCESS || newStatus === ServerOrderStatus.REJECTED || newStatus === ServerOrderStatus.CANCELLED) && !existing.completedAt) {
      data.completedAt = new Date()
    }

    const wasFinal = FINAL_SERVER_ORDER_STATUSES.includes(existing.status)
    const shouldRefund = !wasFinal && (newStatus === ServerOrderStatus.REJECTED || newStatus === ServerOrderStatus.CANCELLED)

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.serverOrder.update({
        where: { id },
        data,
        include: { user: { select: { id: true, name: true } }, service: { select: { title: true } } },
      })
      if (shouldRefund) {
        const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } })
        if (wallet) {
          const newBalance = wallet.balance.add(order.price)
          await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } })
          await tx.walletLedger.create({
            data: { walletId: wallet.id, type: 'REFUND', amount: order.price, balance: newBalance, description: `Refund server order #${order.orderCode}`, referenceId: order.id },
          })
        }
      }
      return order
    })
    return apiSuccess(updated)
  } catch (e) {
    console.error('[ADMIN_SERVER_ORDER_PATCH]', e)
    return apiError('Failed to update', 500)
  }
}
