import { isPrismaMissingTableError } from '@/lib/db-schema-ready';

/**
 * Background scheduler for outgoing webhooks.
 *
 * Every ~60s: enqueue webhooks for newly-completed orders, then drain the
 * pending delivery queue. Mirrors the IMEI/server scheduler pattern and is
 * fully decoupled from the order/supplier workers.
 *
 * Started from instrumentation.node.ts. Disabled via
 * WEBHOOK_SCHEDULER_ENABLED=false.
 */
const DEFAULT_INTERVAL_MS = 60_000;

const g = globalThis as typeof globalThis & {
  __webhookSchedulerStarted?: boolean;
  __webhookSchedulerRunning?: boolean;
  __webhookSchedulerMissingDbWarned?: boolean;
};

function getIntervalMs(): number {
  const raw = process.env.WEBHOOK_POLL_INTERVAL_MS;
  if (!raw) return DEFAULT_INTERVAL_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 20_000 ? n : DEFAULT_INTERVAL_MS;
}

async function tick() {
  if (g.__webhookSchedulerRunning) return;
  g.__webhookSchedulerRunning = true;
  try {
    const { enqueueOrderWebhooks } = await import('./notifier');
    const { processWebhookQueue } = await import('./dispatcher');
    await enqueueOrderWebhooks();
    await processWebhookQueue(100);

    // Per-order Dhru feedback callbacks — decoupled, additive. Runs in the
    // same tick so we don't spin up a second scheduler. A failure here is
    // isolated and never affects the webhook pass above (separate try/catch).
    try {
      const { enqueueOrderFeedback } = await import('@/lib/feedback/notifier');
      const { processFeedbackQueue } = await import('@/lib/feedback/dispatcher');
      await enqueueOrderFeedback();
      await processFeedbackQueue(100);
    } catch (fe) {
      console.error('[WEBHOOK_SCHEDULER] feedback pass error:', fe);
    }
  } catch (e) {
    if (isPrismaMissingTableError(e)) {
      if (!g.__webhookSchedulerMissingDbWarned) {
        g.__webhookSchedulerMissingDbWarned = true;
        console.warn('[WEBHOOK_SCHEDULER] Tables missing — run npm run db:setup');
      }
      return;
    }
    console.error('[WEBHOOK_SCHEDULER] tick error:', e);
  } finally {
    g.__webhookSchedulerRunning = false;
  }
}

export function startWebhookScheduler(): void {
  if (process.env.WEBHOOK_SCHEDULER_ENABLED === 'false') {
    console.log('[WEBHOOK_SCHEDULER] Disabled via WEBHOOK_SCHEDULER_ENABLED=false');
    return;
  }
  if (g.__webhookSchedulerStarted) return;
  g.__webhookSchedulerStarted = true;

  const intervalMs = getIntervalMs();
  console.log(`[WEBHOOK_SCHEDULER] Active — dispatch setiap ${intervalMs / 1000}s`);

  setTimeout(() => void tick(), 12_000);
  setInterval(() => void tick(), intervalMs);
}
