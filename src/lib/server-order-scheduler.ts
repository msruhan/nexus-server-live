/**
 * Background scheduler: submit & poll server orders from supplier every ~90s.
 */
import { pollServerOrderFromSupplier, processServerOrderQueue } from '@/lib/server-order-worker'

const DEFAULT_INTERVAL_MS = 90_000

const globalForScheduler = globalThis as typeof globalThis & {
  __serverSchedulerStarted?: boolean
  __serverSchedulerRunning?: boolean
}

function getIntervalMs() {
  const raw = process.env.SERVER_ORDER_POLL_INTERVAL_MS ?? process.env.IMEI_ORDER_POLL_INTERVAL_MS
  if (!raw) return DEFAULT_INTERVAL_MS
  const n = Number(raw)
  return Number.isFinite(n) && n >= 30_000 ? n : DEFAULT_INTERVAL_MS
}

async function runQueueTick() {
  if (globalForScheduler.__serverSchedulerRunning) return
  globalForScheduler.__serverSchedulerRunning = true
  try {
    await processServerOrderQueue()
  } catch (e) {
    console.error('[SERVER_SCHEDULER] tick error:', e)
  } finally {
    globalForScheduler.__serverSchedulerRunning = false
  }
}

/** Poll satu order beberapa kali setelah submit (tanpa tunggu interval). */
export function scheduleServerOrderFollowUp(orderId: string) {
  const delays = [20_000, 60_000, 120_000, 300_000]
  for (const delay of delays) {
    setTimeout(async () => {
      try {
        const { prisma } = await import('@/lib/db')
        const order = await prisma.serverOrder.findUnique({
          where: { id: orderId },
          select: { status: true },
        })
        if (
          !order ||
          order.status === 'SUCCESS' ||
          order.status === 'REJECTED' ||
          order.status === 'CANCELLED'
        ) {
          return
        }
        await pollServerOrderFromSupplier(orderId)
      } catch (e) {
        console.error(`[SERVER_SCHEDULER] follow-up ${orderId}:`, e)
      }
    }, delay)
  }
}

export function startServerOrderScheduler() {
  if (process.env.SERVER_ORDER_SCHEDULER_ENABLED === 'false') {
    console.log('[SERVER_SCHEDULER] Disabled via SERVER_ORDER_SCHEDULER_ENABLED=false')
    return
  }
  if (globalForScheduler.__serverSchedulerStarted) return
  globalForScheduler.__serverSchedulerStarted = true

  const intervalMs = getIntervalMs()
  console.log(`[SERVER_SCHEDULER] Active — poll supplier setiap ${intervalMs / 1000}s`)

  setTimeout(() => void runQueueTick(), 12_000)
  setInterval(() => void runQueueTick(), intervalMs)
}
