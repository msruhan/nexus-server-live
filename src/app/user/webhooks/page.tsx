import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { WEBHOOK_EVENTS } from '@/lib/webhook/types';
import { WebhooksManager } from './WebhooksManager';

export const dynamic = 'force-dynamic';

export default async function UserWebhooksPage() {
  const session = await auth();
  const userId = session!.user.id;

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { deliveries: true } } },
  });

  function mask(secret: string): string {
    if (secret.length <= 12) return '••••••';
    return secret.slice(0, 8) + '••••' + secret.slice(-4);
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        section="§ Webhooks"
        title={
          <>
            Outgoing <span className="font-serif italic font-normal">webhooks</span>.
          </>
        }
        subtitle="Receive real-time POST callbacks when your orders complete or payments are credited — integrate Recovero into your own system."
      />
      <WebhooksManager
        initialEndpoints={endpoints.map((e) => ({
          id: e.id,
          name: e.name,
          url: e.url,
          isActive: e.isActive,
          events: e.events ? e.events.split(',').map((s) => s.trim()).filter(Boolean) : [],
          secretMasked: mask(e.secret),
          lastStatus: e.lastStatus,
          lastDeliveryAt: e.lastDeliveryAt?.toISOString() ?? null,
          failureCount: e.failureCount,
          deliveryCount: e._count.deliveries,
          createdAt: e.createdAt.toISOString(),
        }))}
        availableEvents={WEBHOOK_EVENTS}
      />
    </div>
  );
}
