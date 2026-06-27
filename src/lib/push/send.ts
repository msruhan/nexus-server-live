import webpush from 'web-push';
import { prisma } from '@/lib/db';
import { configureWebPush, isPushConfigured } from '@/lib/push/vapid';

export type WebPushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

export async function sendWebPushToUser(userId: string, payload: WebPushPayload): Promise<void> {
  if (!isPushConfigured()) return;
  if (!configureWebPush()) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushNotifyEnabled: true },
  });
  if (!user?.pushNotifyEnabled) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    url: payload.url ?? '/user/dashboard',
    tag: payload.tag,
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }),
  );
}
