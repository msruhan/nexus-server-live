/**
 * Webhook dispatcher.
 *
 * Sends queued WebhookDelivery rows to reseller endpoints with HMAC
 * signing, a strict timeout, and exponential backoff retries. Fully
 * decoupled from the order/supplier flow — it only reads existing data
 * and POSTs to external URLs.
 */
import { prisma } from '@/lib/db';
import { signPayload, validateWebhookUrl } from './security';
import type { WebhookPayload } from './types';

const SEND_TIMEOUT_MS = 10_000;
const BACKOFF_MINUTES = [1, 5, 15, 30, 60]; // per attempt index
const AUTO_PAUSE_AFTER = 15; // consecutive endpoint failures → auto-disable

function nextBackoff(attempts: number): Date {
  const idx = Math.min(attempts, BACKOFF_MINUTES.length - 1);
  const mins = BACKOFF_MINUTES[idx];
  return new Date(Date.now() + mins * 60_000);
}

/**
 * Attempt to deliver a single WebhookDelivery row. Updates its status,
 * attempt count, and the parent endpoint health. Never throws.
 */
export async function deliverOne(deliveryId: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  });
  if (!delivery) return { ok: false, error: 'delivery_not_found' };
  if (delivery.status === 'SUCCESS') return { ok: true };
  if (!delivery.endpoint.isActive) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: 'FAILED', error: 'endpoint_inactive' },
    });
    return { ok: false, error: 'endpoint_inactive' };
  }

  // Re-validate the URL each time (defense in depth against SSRF).
  const urlCheck = validateWebhookUrl(delivery.endpoint.url);
  if (!urlCheck.ok) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: 'FAILED', error: `url_rejected: ${urlCheck.reason}`, attempts: { increment: 1 } },
    });
    return { ok: false, error: urlCheck.reason };
  }

  const signature = signPayload(delivery.payload, delivery.endpoint.secret);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  let responseCode: number | null = null;
  let responseBody = '';
  let sendError: string | null = null;

  try {
    const res = await fetch(delivery.endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NexusServer-Webhook/1.0',
        'X-Nexus-Event': delivery.event,
        'X-Nexus-Delivery': delivery.id,
        'X-Nexus-Signature': signature,
      },
      body: delivery.payload,
      signal: controller.signal,
      redirect: 'error', // do not follow redirects (SSRF guard)
    });
    responseCode = res.status;
    responseBody = (await res.text().catch(() => '')).slice(0, 2000);
  } catch (e) {
    sendError = e instanceof Error ? (e.name === 'AbortError' ? 'timeout' : e.message) : 'network_error';
  } finally {
    clearTimeout(timer);
  }

  const success = responseCode != null && responseCode >= 200 && responseCode < 300;
  const attempts = delivery.attempts + 1;

  if (success) {
    await prisma.$transaction([
      prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SUCCESS',
          attempts,
          responseCode,
          responseBody,
          error: null,
          deliveredAt: new Date(),
        },
      }),
      prisma.webhookEndpoint.update({
        where: { id: delivery.endpointId },
        data: { lastStatus: 'success', lastDeliveryAt: new Date(), failureCount: 0 },
      }),
    ]);
    return { ok: true, status: responseCode ?? undefined };
  }

  // Failed attempt.
  const exhausted = attempts >= delivery.maxAttempts;
  const newFailureCount = delivery.endpoint.failureCount + 1;
  const shouldAutoPause = newFailureCount >= AUTO_PAUSE_AFTER;

  await prisma.$transaction([
    prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: exhausted ? 'FAILED' : 'PENDING',
        attempts,
        responseCode: responseCode ?? undefined,
        responseBody: responseBody || undefined,
        error: sendError ?? `http_${responseCode}`,
        nextAttemptAt: exhausted ? delivery.nextAttemptAt : nextBackoff(attempts),
      },
    }),
    prisma.webhookEndpoint.update({
      where: { id: delivery.endpointId },
      data: {
        lastStatus: 'failed',
        lastDeliveryAt: new Date(),
        failureCount: newFailureCount,
        ...(shouldAutoPause ? { isActive: false } : {}),
      },
    }),
  ]);

  return { ok: false, status: responseCode ?? undefined, error: sendError ?? `http_${responseCode}` };
}

/**
 * Drain the pending delivery queue (called by cron / scheduler).
 * Processes due deliveries (nextAttemptAt <= now) up to `limit`.
 */
export async function processWebhookQueue(limit = 50): Promise<{ processed: number; ok: number; failed: number }> {
  const due = await prisma.webhookDelivery.findMany({
    where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: 'asc' },
    take: limit,
    select: { id: true },
  });

  let ok = 0;
  let failed = 0;
  for (const d of due) {
    const r = await deliverOne(d.id);
    if (r.ok) ok += 1;
    else failed += 1;
  }
  return { processed: due.length, ok, failed };
}

/**
 * Enqueue a delivery for every active endpoint of a user subscribed to the
 * event. Idempotent per (endpoint, event, refType, refId) via the unique
 * index — duplicate enqueues are ignored. Never throws.
 */
export async function enqueueWebhook(input: {
  userId: string;
  event: WebhookPayload['event'];
  data: Record<string, unknown>;
  refType?: string | null;
  refId?: string | null;
}): Promise<number> {
  try {
    const { endpointWantsEvent } = await import('./types');
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { userId: input.userId, isActive: true },
    });
    if (endpoints.length === 0) return 0;

    let enqueued = 0;
    for (const ep of endpoints) {
      if (!endpointWantsEvent(ep.events, input.event)) continue;

      const payloadObj: WebhookPayload = {
        id: '', // filled after row creation (we use delivery id)
        event: input.event,
        createdAt: new Date().toISOString(),
        data: input.data,
      };

      try {
        // Create with a placeholder payload, then patch in the real id so
        // the receiver's idempotency key == delivery id.
        const created = await prisma.webhookDelivery.create({
          data: {
            endpointId: ep.id,
            event: input.event,
            status: 'PENDING',
            payload: JSON.stringify(payloadObj),
            refType: input.refType ?? null,
            refId: input.refId ?? null,
          },
        });
        payloadObj.id = created.id;
        await prisma.webhookDelivery.update({
          where: { id: created.id },
          data: { payload: JSON.stringify(payloadObj) },
        });
        enqueued += 1;
      } catch (e) {
        // Unique constraint → already enqueued for this ref; ignore.
        const msg = e instanceof Error ? e.message : '';
        if (!msg.includes('Unique constraint')) {
          console.error('[webhook] enqueue error', e);
        }
      }
    }
    return enqueued;
  } catch (e) {
    console.error('[webhook] enqueueWebhook failed', e);
    return 0;
  }
}
