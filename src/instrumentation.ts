/**
 * Runs once when the Next.js server starts.
 * Schedulers live in instrumentation.node.ts (Node only — not bundled for Edge).
 * On Vercel, prefer `/api/cron/imei-orders`; set ENABLE_BACKGROUND_JOBS=true for in-process polls.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  if (process.env.VERCEL === '1' && process.env.ENABLE_BACKGROUND_JOBS !== 'true') {
    return;
  }

  await import('./instrumentation.node');
}
