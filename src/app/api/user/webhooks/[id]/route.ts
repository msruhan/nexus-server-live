/**
 * User Webhook endpoint — update, delete, and actions (test, rotate secret).
 *
 * PATCH  — update name/url/events/isActive, or action=test|rotate
 * DELETE — remove the endpoint (cascades deliveries)
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { getBranding } from '@/lib/branding';
import {
  generateWebhookSecret,
  validateWebhookUrl,
  signPayload,
} from '@/lib/webhook/security';
import { WEBHOOK_EVENTS, type WebhookEvent, type WebhookPayload } from '@/lib/webhook/types';

const VALID_EVENTS = WEBHOOK_EVENTS.map((e) => e.key) as WebhookEvent[];

const patchSchema = z.object({
  action: z.enum(['update', 'test', 'rotate']).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  url: z.string().trim().min(8).max(2000).optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

async function getOwnedEndpoint(id: string, userId: string) {
  const ep = await prisma.webhookEndpoint.findUnique({ where: { id } });
  if (!ep || ep.userId !== userId) return null;
  return ep;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const ep = await getOwnedEndpoint(id, session.user.id);
  if (!ep) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const action = parsed.data.action ?? 'update';

  // ─── Test: send a sample ping immediately ────────────────────
  if (action === 'test') {
    const urlCheck = validateWebhookUrl(ep.url);
    if (!urlCheck.ok) return NextResponse.json({ error: urlCheck.reason }, { status: 400 });

    const brand = await getBranding();
    const payload: WebhookPayload = {
      id: `test_${Date.now()}`,
      event: 'order.success',
      createdAt: new Date().toISOString(),
      data: {
        test: true,
        message: `This is a test event from ${brand.siteName}`,
        orderCode: 'TEST-0000',
      },
    };
    const body = JSON.stringify(payload);
    const signature = signPayload(body, ep.secret);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NexusServer-Webhook/1.0',
          'X-Nexus-Event': 'test',
          'X-Nexus-Delivery': payload.id,
          'X-Nexus-Signature': signature,
        },
        body,
        signal: controller.signal,
        redirect: 'error',
      });
      const text = (await res.text().catch(() => '')).slice(0, 500);
      const ok = res.status >= 200 && res.status < 300;
      return NextResponse.json({ ok, status: res.status, body: text });
    } catch (e) {
      const msg = e instanceof Error ? (e.name === 'AbortError' ? 'Timeout (10s)' : e.message) : 'Network error';
      return NextResponse.json({ ok: false, error: msg });
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Rotate signing secret ───────────────────────────────────
  if (action === 'rotate') {
    const secret = generateWebhookSecret();
    await prisma.webhookEndpoint.update({ where: { id }, data: { secret } });
    await logActivity({
      userId: session.user.id,
      action: 'webhook.secret_rotated',
      entity: 'WebhookEndpoint',
      entityId: id,
    });
    return NextResponse.json({ ok: true, secret, message: 'New secret — save it now.' });
  }

  // ─── Update fields ───────────────────────────────────────────
  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.isActive !== undefined) {
    data.isActive = parsed.data.isActive;
    // Re-activating clears the failure counter so auto-pause doesn't re-trip instantly.
    if (parsed.data.isActive) data.failureCount = 0;
  }
  if (parsed.data.url !== undefined) {
    const urlCheck = validateWebhookUrl(parsed.data.url);
    if (!urlCheck.ok) return NextResponse.json({ error: urlCheck.reason }, { status: 400 });
    data.url = parsed.data.url;
  }
  if (parsed.data.events !== undefined) {
    const events = parsed.data.events.filter((e): e is WebhookEvent =>
      VALID_EVENTS.includes(e as WebhookEvent),
    );
    data.events = events.length > 0 ? events.join(',') : null;
  }

  await prisma.webhookEndpoint.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const ep = await getOwnedEndpoint(id, session.user.id);
  if (!ep) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.webhookEndpoint.delete({ where: { id } });
  await logActivity({
    userId: session.user.id,
    action: 'webhook.endpoint_deleted',
    entity: 'WebhookEndpoint',
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
