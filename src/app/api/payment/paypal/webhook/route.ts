import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  captureAndCreditPaypalOrder,
  verifyPaypalWebhookSignature,
} from '@/lib/payment/paypal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/payment/paypal/webhook
 *
 * Secondary path: PayPal POSTs us when an order/capture changes state.
 * We listen for:
 *   - CHECKOUT.ORDER.APPROVED   → capture if not yet captured
 *   - PAYMENT.CAPTURE.COMPLETED → ensure intent is CONFIRMED
 *
 * Verification: PayPal's verify-webhook-signature endpoint validates the
 * incoming headers + body using the webhook id we stored. Reject anything
 * we can't verify.
 *
 * Idempotency: capture / credit calls go through PaymentIntent.status
 * checks, so duplicate webhooks are safe.
 */
export async function POST(req: Request) {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      paymentPaypalEnabled: true,
      paymentPaypalWebhookId: true,
    },
  });
  if (!settings?.paymentPaypalEnabled || !settings.paymentPaypalWebhookId) {
    return NextResponse.json({ ok: false, reason: 'paypal_disabled' }, { status: 503 });
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const verified = await verifyPaypalWebhookSignature({
    webhookId: settings.paymentPaypalWebhookId,
    headers: req.headers,
    rawBody: raw,
  });
  if (!verified) {
    console.error('[paypal_webhook] signature verification failed');
    return NextResponse.json({ ok: false, reason: 'invalid_signature' }, { status: 401 });
  }

  let event: {
    event_type?: string;
    resource?: {
      id?: string;
      custom_id?: string;
      invoice_id?: string;
      purchase_units?: Array<{ custom_id?: string }>;
      supplementary_data?: { related_ids?: { order_id?: string } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_json' }, { status: 400 });
  }

  const type = event.event_type ?? '';
  const r = event.resource ?? {};

  // Resolve our internal intent id from the event.
  const intentId =
    r.custom_id ??
    r.purchase_units?.[0]?.custom_id ??
    r.invoice_id ??
    null;
  if (!intentId) {
    return NextResponse.json({ ok: false, reason: 'no_intent_ref' }, { status: 200 });
  }

  if (type === 'CHECKOUT.ORDER.APPROVED' || type === 'PAYMENT.CAPTURE.COMPLETED') {
    const paypalOrderId = r.supplementary_data?.related_ids?.order_id ?? r.id ?? undefined;
    const result = await captureAndCreditPaypalOrder({ intentId, paypalOrderId });
    return NextResponse.json({ ok: result.ok, reason: result.reason });
  }

  // We log other events but don't act on them.
  return NextResponse.json({ ok: true, ignored: type });
}

export function GET() {
  return NextResponse.json({ ok: false, reason: 'POST only' }, { status: 405 });
}
