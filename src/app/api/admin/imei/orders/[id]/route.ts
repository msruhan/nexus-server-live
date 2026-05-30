import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { updateImeiOrderSchema } from '@/lib/validations/imei'
import { ImeiOrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

/** GET /api/admin/imei/orders/[id] — get one order */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const order = await prisma.imeiOrder.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: {
          include: {
            group: { select: { id: true, title: true } },
            api: { select: { id: true, title: true } },
          },
        },
      },
    })
    if (!order) return apiError('Order not found', 404)
    return apiSuccess(order)
  } catch (e) {
    console.error('[ADMIN_IMEI_ORDER_GET]', e)
    return apiError('Failed to fetch orders', 500)
  }
}

/**
 * PATCH /api/admin/imei/orders/[id] — update an order (status, code, comments).
 * On REJECTED/CANCELLED we refund the wallet.
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const body = await req.json()
    const parsed = updateImeiOrderSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    const existing = await prisma.imeiOrder.findUnique({ where: { id } })
    if (!existing) return apiError('Order not found', 404)

    const data: Parameters<typeof prisma.imeiOrder.update>[0]['data'] = {
      ...parsed.data,
    }
    const newStatus = parsed.data.status

    // Stamp processing/completion timestamps
    if (newStatus === ImeiOrderStatus.IN_PROCESS && !existing.processedAt) {
      data.processedAt = new Date()
    }
    if (
      (newStatus === ImeiOrderStatus.SUCCESS ||
        newStatus === ImeiOrderStatus.REJECTED ||
        newStatus === ImeiOrderStatus.CANCELLED) &&
      !existing.completedAt
    ) {
      data.completedAt = new Date()
    }

    // Determine if we need to refund: status moves from non-final to REJECTED or CANCELLED
    const wasFinal =
      existing.status === ImeiOrderStatus.SUCCESS ||
      existing.status === ImeiOrderStatus.REJECTED ||
      existing.status === ImeiOrderStatus.CANCELLED
    const shouldRefund =
      !wasFinal &&
      (newStatus === ImeiOrderStatus.REJECTED || newStatus === ImeiOrderStatus.CANCELLED)

    // Update in a transaction (with optional refund)
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.imeiOrder.update({
        where: { id },
        data,
        include: {
          user: { select: { id: true, name: true, email: true } },
          service: { select: { id: true, title: true } },
        },
      })

      if (shouldRefund) {
        const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } })
        if (wallet) {
          const newBalance = wallet.balance.add(order.price)
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: newBalance },
          })
          await tx.walletLedger.create({
            data: {
              walletId: wallet.id,
              type: 'REFUND',
              amount: order.price,
              balance: newBalance,
              description: `Refund order IMEI #${order.orderCode}`,
              referenceId: order.id,
            },
          })
        }
      }

      return order
    })

    return apiSuccess(updated)
  } catch (e) {
    console.error('[ADMIN_IMEI_ORDER_PATCH]', e)
    return apiError('Failed to update order', 500)
  }
}
