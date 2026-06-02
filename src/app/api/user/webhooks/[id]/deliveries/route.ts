/**
 * GET /api/user/webhooks/[id]/deliveries — recent delivery log for an endpoint
 * POST (action=retry, deliveryId) — re-queue a failed delivery
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

async function getOwnedEndpoint(id: string, userId: string) {
  const ep = await prisma.webhookEndpoint.findUnique({ where: { id } });
  if (!ep || ep.userId !== userId) return null;
  return ep;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const ep = await getOwnedEndpoint(id, session.user.id);
  if (!ep) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const deliveries = await prisma.webhookDelivery.findMany({
    where: { endpointId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      event: true,
      status: true,
      attempts: true,
      maxAttempts: true,
      responseCode: true,
      error: true,
      refType: true,
      refId: true,
      deliveredAt: true,
      createdAt: true,
      nextAttemptAt: true,
    },
  });

  return NextResponse.json({
    deliveries: deliveries.map((d) => ({
      ...d,
      deliveredAt: d.deliveredAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      nextAttemptAt: d.nextAttemptAt.toISOString(),
    })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const ep = await getOwnedEndpoint(id, session.user.id);
  if (!ep) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const deliveryId = body?.deliveryId as string | undefined;
  if (!deliveryId) return NextResponse.json({ error: 'deliveryId required' }, { status: 400 });

  const delivery = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.endpointId !== id) {
    return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
  }

  // Re-queue: reset to PENDING with an immediate next attempt and a fresh budget.
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'PENDING',
      attempts: 0,
      nextAttemptAt: new Date(),
      error: null,
    },
  });

  // Try to send right away (best-effort, never throws out).
  try {
    const { deliverOne } = await import('@/lib/webhook/dispatcher');
    const result = await deliverOne(deliveryId);
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ ok: true, queued: true });
  }
}
