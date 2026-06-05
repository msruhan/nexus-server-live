import { NextResponse } from 'next/server';

/** Coolify / load-balancer health probe — no auth, no DB required. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'nexus-server',
    ts: new Date().toISOString(),
  });
}
