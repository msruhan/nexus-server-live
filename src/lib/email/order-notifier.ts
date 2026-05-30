/**
 * Decoupled order-status email notifier.
 *
 * Why we need this:
 *   - The IMEI / Server order workers are FROZEN by policy (we don't touch
 *     supplier flow). So we can't add a side-effect inside the worker that
 *     fires the email at status flip time.
 *   - Instead, this module scans recently-completed orders and sends
 *     notifications for any that don't yet have an EmailLog row for that
 *     event. Idempotent: re-runs are safe because EmailLog.refType + refId
 *     + event uniquely tag the notification.
 *
 * Triggered by: GET /api/cron/email-notifications
 */
import { prisma } from '@/lib/db';
import { notifyOrderStatus } from './notify';

const LOOKBACK_MINUTES = 30;

async function alreadyNotified(refType: string, refId: string, event: string): Promise<boolean> {
  const row = await prisma.emailLog.findFirst({
    where: { refType, refId, event, status: { in: ['SENT', 'PENDING'] } },
    select: { id: true },
  });
  return !!row;
}

export async function dispatchOrderEmails(): Promise<{ imei: number; server: number }> {
  const since = new Date(Date.now() - LOOKBACK_MINUTES * 60_000);

  let imeiSent = 0;
  let serverSent = 0;

  const imeiOrders = await prisma.imeiOrder.findMany({
    where: {
      status: { in: ['SUCCESS', 'REJECTED'] },
      completedAt: { gte: since },
    },
    select: {
      id: true,
      status: true,
    },
    take: 200,
  });
  for (const o of imeiOrders) {
    const event = o.status === 'SUCCESS' ? 'order.imei.success' : 'order.imei.rejected';
    if (await alreadyNotified('ImeiOrder', o.id, event)) continue;
    await notifyOrderStatus({ kind: 'imei', orderId: o.id });
    imeiSent += 1;
  }

  const serverOrders = await prisma.serverOrder.findMany({
    where: {
      status: { in: ['SUCCESS', 'REJECTED'] },
      completedAt: { gte: since },
    },
    select: {
      id: true,
      status: true,
    },
    take: 200,
  });
  for (const o of serverOrders) {
    const event = o.status === 'SUCCESS' ? 'order.server.success' : 'order.server.rejected';
    if (await alreadyNotified('ServerOrder', o.id, event)) continue;
    await notifyOrderStatus({ kind: 'server', orderId: o.id });
    serverSent += 1;
  }

  return { imei: imeiSent, server: serverSent };
}
