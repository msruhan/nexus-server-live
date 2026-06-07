/** How long a PENDING order may wait for first supplier submit before auto-reject + refund. */
const DEFAULT_SUBMIT_WINDOW_MS = 15 * 60_000

export function getOrderSubmitWindowMs(): number {
  const raw = process.env.ORDER_SUBMIT_WINDOW_MS
  if (!raw) return DEFAULT_SUBMIT_WINDOW_MS
  const n = Number(raw)
  return Number.isFinite(n) && n >= 60_000 ? n : DEFAULT_SUBMIT_WINDOW_MS
}

export function isOrderSubmitWindowExpired(createdAt: Date, now = Date.now()): boolean {
  return now - createdAt.getTime() > getOrderSubmitWindowMs()
}

export const STALE_SUBMIT_REJECT_MESSAGE =
  '[Auto-rejected] Submit window expired — order was not sent to supplier in time (e.g. during API outage). Wallet refunded. Please place a new order.'
