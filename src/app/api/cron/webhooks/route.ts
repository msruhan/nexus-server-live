import { apiError, apiSuccess } from '@/lib/api-auth';
import { validateCronSecret } from '@/lib/cron-auth';
import { enqueueOrderWebhooks } from '@/lib/webhook/notifier';
import { processWebhookQueue } from '@/lib/webhook/dispatcher';
import { enqueueOrderFeedback } from '@/lib/feedback/notifier';
import { processFeedbackQueue } from '@/lib/feedback/dispatcher';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/cron/webhooks
 *
 * 1. Scans recently-completed orders and enqueues webhook deliveries
 *    (idempotent — safe to re-run).
 * 2. Drains the pending webhook delivery queue (with retry).
 * 3. Same for per-order Dhru feedback callbacks (decoupled, additive).
 *
 * Decoupled from the order/supplier workers — never affects order flow.
 */
async function handle(req: Request) {
  const cronAuth = validateCronSecret(req);
  if (cronAuth) return cronAuth;
  try {
    const enqueued = await enqueueOrderWebhooks();
    const drained = await processWebhookQueue(100);

    // Per-order Dhru feedback callbacks (independent of webhooks above).
    const feedbackEnqueued = await enqueueOrderFeedback();
    const feedbackDrained = await processFeedbackQueue(100);

    return apiSuccess({ enqueued, drained, feedbackEnqueued, feedbackDrained });
  } catch (e) {
    console.error('[CRON_WEBHOOKS]', e);
    return apiError('Cron run failed', 500);
  }
}

export const GET = handle;
export const POST = handle;
