/**
 * Decoupled per-order feedback notifier (Dhru Fusion Pro compatible).
 *
 * Mirrors src/lib/webhook/notifier.ts. The IMEI / Server order workers are
 * FROZEN — instead of firing inside the worker, we scan recently completed
 * orders that were placed with a `feedback_url` and enqueue a FeedbackDelivery
 * for any not yet queued.
 *
 * Idempotency is doubly guaranteed:
 *   1. We only scan orders whose `feedbackStatus` is still null (un-enqueued),
 *      and flip it to "PENDING" the moment we enqueue.
 *   2. The unique index on FeedbackDelivery (orderKind, orderId, status)
 *      rejects a second PENDING row for the same order.
 *
 * Triggered by: the webhook dispatch cron / in-process scheduler.
 */
import { prisma } from '@/lib/db';

const LOOKBACK_MINUTES = 30;

/** Dhru feedback uses a textual status: "success" | "rejected". */
function feedbackStatusText(orderStatus: string): 'success' | 'rejected' {
  return orderStatus === 'SUCCESS' ? 'success' : 'rejected';
}

/** Dhru `replay` field — base64 of the result code (success) or comments. */
function encodeReplay(code: string | null, comments: string | null): string {
  const raw = (code && code.trim().length > 0 ? code : comments) ?? '';
  return Buffer.from(raw, 'utf8').toString('base64');
}

type ScannedOrder = {
  id: string;
  status: string;
  code: string | null;
  comments: string | null;
  callerReference: string | null;
  feedbackUrl: string | null;
};

async function enqueueOne(kind: 'imei' | 'server', o: ScannedOrder): Promise<boolean> {
  if (!o.feedbackUrl) return false;

  const status = feedbackStatusText(o.status);
  const payload = JSON.stringify({
    reference_id: o.callerReference ?? o.id,
    order_id: o.id,
    status,
    replay: encodeReplay(o.code, o.comments),
  });

  try {
    await prisma.feedbackDelivery.create({
      data: {
        orderKind: kind,
        orderId: o.id,
        url: o.feedbackUrl,
        callerRef: o.callerReference ?? null,
        status: 'PENDING',
        payload,
      },
    });
  } catch {
    // Unique violation (already enqueued) — treat as no-op, but still mark
    // the order below so it stops being re-scanned.
  }

  // Flip the order's feedbackStatus so it leaves the scan window.
  try {
    if (kind === 'imei') {
      await prisma.imeiOrder.update({ where: { id: o.id }, data: { feedbackStatus: 'PENDING' } });
    } else {
      await prisma.serverOrder.update({ where: { id: o.id }, data: { feedbackStatus: 'PENDING' } });
    }
  } catch {
    /* order vanished; ignore */
  }
  return true;
}

/**
 * Scan recently-completed orders that carry a feedback_url and have not yet
 * been enqueued, then create their FeedbackDelivery rows. Returns counts.
 */
export async function enqueueOrderFeedback(): Promise<{ imei: number; server: number }> {
  const since = new Date(Date.now() - LOOKBACK_MINUTES * 60_000);
  let imei = 0;
  let server = 0;

  const imeiOrders = await prisma.imeiOrder.findMany({
    where: {
      status: { in: ['SUCCESS', 'REJECTED'] },
      completedAt: { gte: since },
      feedbackUrl: { not: null },
      feedbackStatus: null,
    },
    select: {
      id: true,
      status: true,
      code: true,
      comments: true,
      callerReference: true,
      feedbackUrl: true,
    },
    take: 200,
  });
  for (const o of imeiOrders) {
    if (await enqueueOne('imei', o)) imei += 1;
  }

  const serverOrders = await prisma.serverOrder.findMany({
    where: {
      status: { in: ['SUCCESS', 'REJECTED'] },
      completedAt: { gte: since },
      feedbackUrl: { not: null },
      feedbackStatus: null,
    },
    select: {
      id: true,
      status: true,
      code: true,
      comments: true,
      callerReference: true,
      feedbackUrl: true,
    },
    take: 200,
  });
  for (const o of serverOrders) {
    if (await enqueueOne('server', o)) server += 1;
  }

  return { imei, server };
}
