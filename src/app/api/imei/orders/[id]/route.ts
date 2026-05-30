import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth'
import { maybeAdvanceImeiOrderFulfillment } from '@/lib/imei-order-stress-fulfillment'
import { ImeiOrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

/** GET /api/imei/orders/[id] — get current user's order detail */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiAuth()
  if (error) return error

  try {
    const { id } = await context.params
    const existing = await prisma.imeiOrder.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            description: true,
            group: { select: { id: true, title: true } },
          },
        },
      },
    })
    if (!existing) return apiError('Order not found', 404)
    if (existing.userId !== session.user.id) {
      return apiError('Access denied', 403)
    }

    const advanced = await maybeAdvanceImeiOrderFulfillment(id)
    const order =
      advanced ??
      (await prisma.imeiOrder.findUnique({
        where: { id },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              description: true,
              group: { select: { id: true, title: true } },
            },
          },
        },
      }))
    if (!order) return apiError('Order not found', 404)
    return apiSuccess(order)
  } catch (e) {
    console.error('[IMEI_ORDER_DETAIL_GET]', e)
    return apiError('Failed to fetch orders', 500)
  }
}

/**
 * DELETE /api/imei/orders/[id] — user cancels their own pending order.
 * Refunds the wallet.
 */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiAuth()
  if (error) return error

  try {
    const { id } = await context.params
    const order = await prisma.imeiOrder.findUnique({ where: { id } })
    if (!order) return apiError('Order not found', 404)
    if (order.userId !== session.user.id) {
      return apiError('Access denied', 403)
    }
    if (order.status !== ImeiOrderStatus.PENDING) {
      return apiError('Orders in progress or completed cannot be cancelled')
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const updated = await tx.imeiOrder.update({
        where: { id },
        data: {
          status: ImeiOrderStatus.CANCELLED,
          completedAt: new Date(),
          comments: 'Cancelled by user',
        },
      })

      const wallet = await tx.wallet.findUnique({ where: { userId: session.user.id } })
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

      return updated
    })

    return apiSuccess(cancelled)
  } catch (e) {
    console.error('[IMEI_ORDER_DELETE]', e)
    return apiError('Failed to cancel order', 500)
  }
}
