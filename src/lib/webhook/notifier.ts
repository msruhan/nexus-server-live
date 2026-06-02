/**
 * Decoupled webhook notifier for order status changes.
 *
 * Same philosophy as src/lib/email/order-notifier.ts:
 *   - The IMEI / Server order workers are FROZEN (we never touch supplier
 *     flow). So instead of firing inside the worker, we scan recently
 *     completed orders and enqueue webhook deliveries for any not yet
 *     queued. Idempotency is guaranteed by the unique index on
 *     (endpointId, event, refType, refId).
 *
 * Triggered by: the webhook dispatch cron / in-process scheduler.
 */
import { prisma } from '@/lib/db';
import { enqueueWebhook } from './dispatcher';
import type { WebhookEvent } from './types';

const LOOKBACK_MINUTES = 30;

/**
 * Scan recently completed orders and enqueue order.success / order.rejected
 * webhooks. Returns counts of newly enqueued deliveries.
 */
export async function enqueueOrderWebhooks(): Promise<{ imei: number; server: number }> {
  const since = new Date(Date.now() - LOOKBACK_MINUTES * 60_000);
  let imei = 0;
  let server = 0;

  const imeiOrders = await prisma.imeiOrder.findMany({
    where: { status: { in: ['SUCCESS', 'REJECTED'] }, completedAt: { gte: since } },
    select: {
      id: true,
      orderCode: true,
      status: true,
      code: true,
      comments: true,
      userId: true,
      completedAt: true,
      service: { select: { title: true } },
    },
    take: 200,
  });
  for (const o of imeiOrders) {
    const event: WebhookEvent = o.status === 'SUCCESS' ? 'order.success' : 'order.rejected';
    const n = await enqueueWebhook({
      userId: o.userId,
      event,
      refType: 'ImeiOrder',
      refId: o.id,
      data: {
        kind: 'imei',
        orderCode: o.orderCode,
        status: o.status,
        service: o.service?.title ?? null,
        code: o.code ?? null,
        comments: o.comments ?? null,
        completedAt: o.completedAt?.toISOString() ?? null,
      },
    });
    imei += n;
  }

  const serverOrders = await prisma.serverOrder.findMany({
    where: { status: { in: ['SUCCESS', 'REJECTED'] }, completedAt: { gte: since } },
    select: {
      id: true,
      orderCode: true,
      status: true,
      code: true,
      comments: true,
      userId: true,
      completedAt: true,
      service: { select: { title: true } },
    },
    take: 200,
  });
  for (const o of serverOrders) {
    const event: WebhookEvent = o.status === 'SUCCESS' ? 'order.success' : 'order.rejected';
    const n = await enqueueWebhook({
      userId: o.userId,
      event,
      refType: 'ServerOrder',
      refId: o.id,
      data: {
        kind: 'server',
        orderCode: o.orderCode,
        status: o.status,
        service: o.service?.title ?? null,
        code: o.code ?? null,
        comments: o.comments ?? null,
        completedAt: o.completedAt?.toISOString() ?? null,
      },
    });
    server += n;
  }

  return { imei, server };
}
