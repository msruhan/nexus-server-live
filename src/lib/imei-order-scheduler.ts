/**
 * Background scheduler: poll IMEI order status from supplier every ~90s.
 * Started via instrumentation.ts when the Node server boots (npm start / npm dev).
 */
import { pollImeiOrderFromSupplier, processImeiOrderQueue } from '@/lib/imei-order-worker'

const DEFAULT_INTERVAL_MS = 90_000 // 1.5 menit (antara 1–2 menit)

const globalForScheduler = globalThis as typeof globalThis & {
  __imeiSchedulerStarted?: boolean
  __imeiSchedulerRunning?: boolean
}

function getIntervalMs() {
  const raw = process.env.IMEI_ORDER_POLL_INTERVAL_MS
  if (!raw) return DEFAULT_INTERVAL_MS
  const n = Number(raw)
  return Number.isFinite(n) && n >= 30_000 ? n : DEFAULT_INTERVAL_MS
}

async function runQueueTick() {
  if (globalForScheduler.__imeiSchedulerRunning) return
  globalForScheduler.__imeiSchedulerRunning = true
  try {
    await processImeiOrderQueue()
  } catch (e) {
    console.error('[IMEI_SCHEDULER] tick error:', e)
  } finally {
    globalForScheduler.__imeiSchedulerRunning = false
  }
}

/** Poll satu order beberapa kali setelah submit (tanpa tunggu cron). */
export function scheduleImeiOrderFollowUp(orderId: string) {
  const delays = [20_000, 60_000, 120_000, 300_000]
  for (const delay of delays) {
    setTimeout(async () => {
      try {
        const { prisma } = await import('@/lib/db')
        const order = await prisma.imeiOrder.findUnique({
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
        await pollImeiOrderFromSupplier(orderId)
      } catch (e) {
        console.error(`[IMEI_SCHEDULER] follow-up ${orderId}:`, e)
      }
    }, delay)
  }
}

/** Mulai interval global (sekali per proses Node). */
export function startImeiOrderScheduler() {
  if (process.env.IMEI_ORDER_SCHEDULER_ENABLED === 'false') {
    console.log('[IMEI_SCHEDULER] Disabled via IMEI_ORDER_SCHEDULER_ENABLED=false')
    return
  }
  if (globalForScheduler.__imeiSchedulerStarted) return
  globalForScheduler.__imeiSchedulerStarted = true

  const intervalMs = getIntervalMs()
  console.log(`[IMEI_SCHEDULER] Active — poll supplier setiap ${intervalMs / 1000}s`)

  setTimeout(() => void runQueueTick(), 8_000)
  setInterval(() => void runQueueTick(), intervalMs)
}
