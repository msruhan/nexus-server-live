import { prisma } from '@/lib/db'
import {
  extractServerStressEmail,
  isServerStressRejectPoll,
  isServerStressSuccess,
} from '@/lib/server-stress-mock'
import { isStressTestMode } from '@/lib/stress-mode'
import type { ServerOrder } from '@prisma/client'

/**
 * Simulated supplier polling for server orders in stress-test mode.
 * Called from GET /api/imei/server-orders/[id].
 */
export async function maybeAdvanceServerOrderFulfillment(
  orderId: string,
): Promise<ServerOrder | null> {
  if (!isStressTestMode()) return null

  const order = await prisma.serverOrder.findUnique({ where: { id: orderId } })
  if (!order) return null
  if (order.status === 'SUCCESS' || order.status === 'REJECTED' || order.status === 'CANCELLED') {
    return order
  }

  const email = extractServerStressEmail(order.requiredFields)
  const elapsed = Date.now() - order.createdAt.getTime()
  const stressEmail = isServerStressSuccess(email) || isServerStressRejectPoll(email)
  if (!order.referenceId && !stressEmail) return order

  if (isServerStressRejectPoll(email) && elapsed >= 2_000) {
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
            description: `Refund order server #${order.orderCode}`,
            referenceId: order.id,
          },
        })
      }
      return tx.serverOrder.update({
        where: { id: orderId },
        data: {
          status: 'REJECTED',
          comments: '[Stress mock] Server order failed, funds refunded',
          completedAt: new Date(),
        },
      })
    })
  }

  if (isServerStressSuccess(email)) {
    if (elapsed >= 3_000) {
      return prisma.serverOrder.update({
        where: { id: orderId },
        data: {
          status: 'SUCCESS',
          code: 'LICENSE-KEY: ABCD-1234-EFGH-5678',
          comments: null,
          completedAt: new Date(),
        },
      })
    }
    if (elapsed >= 1_000 && order.status === 'PENDING') {
      return prisma.serverOrder.update({
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
