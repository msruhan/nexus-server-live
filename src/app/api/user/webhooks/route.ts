/**
 * User Webhooks API — list + create endpoints.
 *
 * GET  — list current user's webhook endpoints (secret masked)
 * POST — create a new endpoint (returns the secret ONCE)
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { generateWebhookSecret, validateWebhookUrl } from '@/lib/webhook/security';
import { WEBHOOK_EVENTS, type WebhookEvent } from '@/lib/webhook/types';

const MAX_ENDPOINTS = 10;
const VALID_EVENTS = WEBHOOK_EVENTS.map((e) => e.key) as WebhookEvent[];

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  url: z.string().trim().min(8).max(2000),
  events: z.array(z.string()).optional(),
});

function maskSecret(secret: string): string {
  if (secret.length <= 12) return '••••••';
  return secret.slice(0, 8) + '••••' + secret.slice(-4);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { deliveries: true } } },
  });

  return NextResponse.json({
    endpoints: endpoints.map((e) => ({
      id: e.id,
      name: e.name,
      url: e.url,
      isActive: e.isActive,
      events: e.events ? e.events.split(',').map((s) => s.trim()).filter(Boolean) : [],
      secretMasked: maskSecret(e.secret),
      lastStatus: e.lastStatus,
      lastDeliveryAt: e.lastDeliveryAt?.toISOString() ?? null,
      failureCount: e.failureCount,
      deliveryCount: e._count.deliveries,
      createdAt: e.createdAt.toISOString(),
    })),
    availableEvents: WEBHOOK_EVENTS,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const count = await prisma.webhookEndpoint.count({ where: { userId: session.user.id } });
  if (count >= MAX_ENDPOINTS) {
    return NextResponse.json({ error: `Maximum ${MAX_ENDPOINTS} endpoints reached` }, { status: 400 });
  }

  const urlCheck = validateWebhookUrl(parsed.data.url);
  if (!urlCheck.ok) {
    return NextResponse.json({ error: urlCheck.reason }, { status: 400 });
  }

  // Filter events to the known catalog. Empty array = subscribe to all.
  const events = (parsed.data.events ?? []).filter((e): e is WebhookEvent =>
    VALID_EVENTS.includes(e as WebhookEvent),
  );

  const secret = generateWebhookSecret();
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      url: parsed.data.url,
      secret,
      events: events.length > 0 ? events.join(',') : null,
    },
  });

  await logActivity({
    userId: session.user.id,
    action: 'webhook.endpoint_created',
    entity: 'WebhookEndpoint',
    entityId: endpoint.id,
    metadata: { url: parsed.data.url },
  });

  // Secret returned in FULL exactly once.
  return NextResponse.json(
    {
      ok: true,
      id: endpoint.id,
      secret,
      message: 'Save this signing secret now — it will not be shown again.',
    },
    { status: 201 },
  );
}
