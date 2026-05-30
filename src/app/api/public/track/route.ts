import { NextResponse } from 'next/server';
import { lookupOrderByCode, isLikelyOrderCode } from '@/lib/order-tracker';
import { getClientIp } from '@/lib/ip-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/track?code=ID-K7VN3P2WXR9M
 *
 * Anonymous public lookup. Returns a sanitized snapshot suitable for the
 * `/track` page or for embedding the lookup widget on partner sites.
 *
 * Anti-abuse:
 *   - Per-IP soft rate limit using a small in-memory window (60 lookups
 *     per minute). This is best-effort and intentionally lightweight; the
 *     real protection is the high-entropy order code (~33 bits) which
 *     makes brute-force enumeration impractical.
 *   - Strict format validation before touching the DB.
 */

const WINDOW_MS = 60_000;
const LIMIT = 60;
type Bucket = { count: number; resetAt: number };
const ipBuckets = new Map<string, Bucket>();

function rateLimit(ip: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSec: 0 };
  }
  bucket.count += 1;
  if (bucket.count > LIMIT) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

// Tiny periodic cleanup so the map doesn't grow unbounded across long uptimes.
let lastSweep = Date.now();
function sweepIfNeeded() {
  const now = Date.now();
  if (now - lastSweep < WINDOW_MS) return;
  for (const [k, v] of ipBuckets) {
    if (v.resetAt < now) ipBuckets.delete(k);
  }
  lastSweep = now;
}

export async function GET(req: Request) {
  sweepIfNeeded();

  const url = new URL(req.url);
  const code = (url.searchParams.get('code') ?? '').trim();
  if (!code) {
    return NextResponse.json(
      { success: false, error: 'Missing order code' },
      { status: 400 },
    );
  }
  if (!isLikelyOrderCode(code)) {
    return NextResponse.json(
      { success: false, error: 'Invalid order code format' },
      { status: 400 },
    );
  }

  const ip = getClientIp(req) ?? 'unknown';
  const limit = rateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many lookups. Please wait.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const order = await lookupOrderByCode(code);
  if (!order) {
    // Return 404 with a generic message — do NOT leak whether the prefix
    // class is valid (don't tell the client "code valid but unknown").
    return NextResponse.json(
      { success: false, error: 'Order not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: order });
}
