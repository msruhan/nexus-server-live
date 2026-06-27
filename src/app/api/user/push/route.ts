import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { isPushConfigured } from '@/lib/push/vapid';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pushNotifyEnabled: true },
  });

  const count = await prisma.pushSubscription.count({ where: { userId: session.user.id } });

  return NextResponse.json({
    configured: isPushConfigured(),
    notifyEnabled: user?.pushNotifyEnabled ?? true,
    subscribed: count > 0,
    subscriptionCount: count,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === 'toggleNotify') {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { pushNotifyEnabled: !!body.enabled },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'subscribe') {
    const sub = body.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent') ?? undefined;

    await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        userId: session.user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent,
      },
      update: {
        userId: session.user.id,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (action === 'unsubscribe') {
    const endpoint = body.endpoint as string | undefined;
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { userId: session.user.id, endpoint },
      });
    } else {
      await prisma.pushSubscription.deleteMany({ where: { userId: session.user.id } });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
