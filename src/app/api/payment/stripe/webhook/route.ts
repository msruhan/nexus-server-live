import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { creditWalletForIntent } from '@/lib/payment/credit';
import { verifyStripeWebhook } from '@/lib/payment/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/payment/stripe/webhook
 *
 * Stripe webhook endpoint. We listen for:
 *   - checkout.session.completed     → primary credit trigger
 *   - checkout.session.async_payment_succeeded
 *   - checkout.session.expired       → mark intent EXPIRED
 *
 * Signature verification is mandatory; we reject any request that fails.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature');
  const event = await verifyStripeWebhook(raw, sig);
  if (!event) {
    return NextResponse.json({ ok: false, reason: 'invalid_signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      const intentId = (session.metadata?.intent_id ?? session.client_reference_id) || null;
      if (!intentId) {
        return NextResponse.json({ ok: false, reason: 'no_intent_ref' }, { status: 200 });
      }
      // Credit. Idempotent if already CONFIRMED.
      const result = await creditWalletForIntent({
        intentId,
        txHash: session.payment_intent?.toString() ?? session.id,
      });
      return NextResponse.json({ ok: result.ok, reason: result.ok ? undefined : result.reason });
    }
    case 'checkout.session.expired': {
      // We let the cron expirer handle it; nothing to do here besides
      // acknowledging.
      return NextResponse.json({ ok: true, ignored: 'expired' });
    }
    default:
      return NextResponse.json({ ok: true, ignored: event.type });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, reason: 'POST only' }, { status: 405 });
}
