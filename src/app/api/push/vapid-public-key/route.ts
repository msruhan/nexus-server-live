import { NextResponse } from 'next/server';
import { getVapidPublicKey, isPushConfigured } from '@/lib/push/vapid';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json({ ok: false, error: 'Push not configured' }, { status: 503 });
  }
  const publicKey = getVapidPublicKey();
  return NextResponse.json({ ok: true, publicKey });
}
