/**
 * Per-order feedback callback dispatcher (Dhru Fusion Pro compatible).
 *
 * When an inbound order was placed with a `feedback_url`, we POST a
 * status-change notification to that URL once the order completes:
 *
 *   { reference_id, order_id, status, replay }
 *
 * - `reference_id` : the caller-supplied reference_id (echoed)
 * - `order_id`     : our order id (the value the caller polls)
 * - `status`       : "success" | "rejected"
 * - `replay`       : base64-encoded result code/comments (Dhru `replay`)
 *
 * Fully decoupled from the supplier workers. Reuses the webhook security
 * helpers for SSRF-safe URL validation. Never throws out of the caller.
 */
import { prisma } from '@/lib/db';
import { validateWebhookUrl } from '@/lib/webhook/security';

const SEND_TIMEOUT_MS = 10_000;
const BACKOFF_MINUTES = [1, 5, 15, 30, 60];

function nextBackoff(attempts: number): Date {
  const idx = Math.min(attempts, BACKOFF_MINUTES.length - 1);
  return new Date(Date.now() + BACKOFF_MINUTES[idx] * 60_000);
}

/** Deliver a single feedback row. Never throws. */
export async function deliverFeedback(id: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const fb = await prisma.feedbackDelivery.findUnique({ where: { id } });
  if (!fb) return { ok: false, error: 'not_found' };
  if (fb.status === 'SUCCESS') return { ok: true };

  // SSRF guard — re-validate the URL each attempt.
  const urlCheck = validateWebhookUrl(fb.url);
  if (!urlCheck.ok) {
    await prisma.feedbackDelivery.update({
      where: { id },
      data: { status: 'FAILED', error: `url_rejected: ${urlCheck.reason}`, attempts: { increment: 1 } },
    });
    return { ok: false, error: urlCheck.reason };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  let responseCode: number | null = null;
  let responseBody = '';
  let sendError: string | null = null;

  try {
    const res = await fetch(fb.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NexusServer-Feedback/1.0',
      },
      body: fb.payload,
      signal: controller.signal,
      redirect: 'error',
    });
    responseCode = res.status;
    responseBody = (await res.text().catch(() => '')).slice(0, 2000);
  } catch (e) {
    sendError = e instanceof Error ? (e.name === 'AbortError' ? 'timeout' : e.message) : 'network_error';
  } finally {
    clearTimeout(timer);
  }

  const success = responseCode != null && responseCode >= 200 && responseCode < 300;
  const attempts = fb.attempts + 1;

  if (success) {
    await prisma.feedbackDelivery.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        attempts,
        responseCode,
        responseBody,
        error: null,
        deliveredAt: new Date(),
      },
    });
    // Mark the order's feedbackStatus = SENT (best-effort).
    await markOrderFeedbackStatus(fb.orderKind, fb.orderId, 'SENT');
    return { ok: true, status: responseCode ?? undefined };
  }

  const exhausted = attempts >= fb.maxAttempts;
  await prisma.feedbackDelivery.update({
    where: { id },
    data: {
      status: exhausted ? 'FAILED' : 'PENDING',
      attempts,
      responseCode: responseCode ?? undefined,
      responseBody: responseBody || undefined,
      error: sendError ?? `http_${responseCode}`,
      nextAttemptAt: exhausted ? fb.nextAttemptAt : nextBackoff(attempts),
    },
  });
  if (exhausted) await markOrderFeedbackStatus(fb.orderKind, fb.orderId, 'FAILED');
  return { ok: false, status: responseCode ?? undefined, error: sendError ?? `http_${responseCode}` };
}

async function markOrderFeedbackStatus(kind: string, orderId: string, status: string) {
  try {
    if (kind === 'imei') {
      await prisma.imeiOrder.update({ where: { id: orderId }, data: { feedbackStatus: status } });
    } else {
      await prisma.serverOrder.update({ where: { id: orderId }, data: { feedbackStatus: status } });
    }
  } catch {
    /* order may have been deleted; ignore */
  }
}

/** Drain the pending feedback queue (called by the webhook cron/scheduler). */
export async function processFeedbackQueue(limit = 50): Promise<{ processed: number; ok: number; failed: number }> {
  const due = await prisma.feedbackDelivery.findMany({
    where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: 'asc' },
    take: limit,
    select: { id: true },
  });
  let ok = 0;
  let failed = 0;
  for (const d of due) {
    const r = await deliverFeedback(d.id);
    if (r.ok) ok += 1;
    else failed += 1;
  }
  return { processed: due.length, ok, failed };
}
