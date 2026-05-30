import { prisma } from '@/lib/db'
import {
  isImeiStressRejectPoll,
  isImeiStressSuccess,
} from '@/lib/imei-stress-mock'
import { isStressTestMode } from '@/lib/stress-mode'
import type { ImeiOrder } from '@prisma/client'

/**
 * Simulated supplier polling for IMEI orders in stress-test mode.
 * Called from GET /api/imei/orders/[id] (mirrors topup fulfillment pattern).
 */
export async function maybeAdvanceImeiOrderFulfillment(
  orderId: string,
): Promise<ImeiOrder | null> {
  if (!isStressTestMode()) return null

  const order = await prisma.imeiOrder.findUnique({ where: { id: orderId } })
  if (!order) return null
  if (order.status === 'SUCCESS' || order.status === 'REJECTED' || order.status === 'CANCELLED') {
    return order
  }

  const elapsed = Date.now() - order.createdAt.getTime()
  const stressImei =
    isImeiStressSuccess(order.imei) || isImeiStressRejectPoll(order.imei)
  if (!order.referenceId && !stressImei) return order

  if (isImeiStressRejectPoll(order.imei) && elapsed >= 2_000) {
    return prisma.$transaction(async (tx) => {
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
      return tx.imeiOrder.update({
        where: { id: orderId },
        data: {
          status: 'REJECTED',
          comments: '[Stress mock] Order failed, funds refunded',
          completedAt: new Date(),
        },
      })
    })
  }

  if (isImeiStressSuccess(order.imei)) {
    if (elapsed >= 3_000) {
      return prisma.imeiOrder.update({
        where: { id: orderId },
        data: {
          status: 'SUCCESS',
          code: 'NCK: 12345678\nFREEZE: 87654321',
          comments: null,
          completedAt: new Date(),
        },
      })
    }
    if (elapsed >= 1_000 && order.status === 'PENDING') {
      return prisma.imeiOrder.update({
        where: { id: orderId },
        data: {
          status: 'IN_PROCESS',
          processedAt: order.processedAt ?? new Date(),
        },
      })
    }
  }

  return order
}
