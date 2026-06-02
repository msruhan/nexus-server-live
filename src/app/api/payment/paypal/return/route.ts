import { NextResponse } from 'next/server';
import { captureAndCreditPaypalOrder } from '@/lib/payment/paypal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/payment/paypal/return?intent=<intent.id>&token=<paypalOrderId>&PayerID=<payer>
 *
 * Browser-facing redirect target after the user approves payment on
 * PayPal's hosted checkout. We capture immediately and bounce them back
 * to the wallet page with a success/failure flag.
 *
 * The webhook handler is the secondary path — it ALSO captures (no-op
 * if we already did) so a user closing the tab still completes the flow.
 */
function bounceTo(url: URL, status: 'success' | 'failed' | 'cancelled', reason?: string) {
  const u = new URL(url);
  u.searchParams.set('payment', status);
  if (reason) u.searchParams.set('reason', reason);
  return NextResponse.redirect(u, 303);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const intentId = url.searchParams.get('intent') ?? '';
  const paypalOrderId = url.searchParams.get('token') ?? undefined;
  const next = url.searchParams.get('next');
  const nextSafe = next && next.startsWith('/') ? next : null;
  const wallet = new URL(nextSafe ?? '/user/wallet', url.origin);

  if (!intentId) return bounceTo(wallet, 'failed', 'missing_intent');

  const result = await captureAndCreditPaypalOrder({ intentId, paypalOrderId });
  return bounceTo(wallet, result.ok ? 'success' : 'failed', result.reason);
}
