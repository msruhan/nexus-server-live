/**
 * PayPal gateway (Orders v2 API).
 *
 * Flow:
 *   1. createPaypalIntent → POST /v2/checkout/orders, return approve URL
 *      and our internal intent id. User redirected to PayPal hosted page.
 *   2. After user approves, PayPal redirects to /api/payment/paypal/return
 *      with ?token=<orderId>. We then POST /v2/checkout/orders/{id}/capture.
 *   3. On capture COMPLETED, credit the wallet via creditWalletForIntent.
 *   4. Webhook (PAYMENT.CAPTURE.COMPLETED) is the secondary path so even
 *      if the user closes the tab we still capture funds. Both paths are
 *      idempotent thanks to our PaymentIntent.status check.
 *
 * Reference: https://developer.paypal.com/docs/api/orders/v2/
 *
 * Constraints:
 *   - We DO NOT touch supplier flow.
 *   - Wallet credit goes through the existing creditWalletForIntent helper.
 *   - Tokens cached for the access-token lifetime to reduce API calls.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getBranding } from '@/lib/branding';
import type { CreateIntentInput, CreateIntentResult, RedirectPayload } from './types';

type Settings = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
};

type CachedToken = { token: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

function apiBase(mode: 'sandbox' | 'live'): string {
  return mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

async function loadSettings(): Promise<Settings | null> {
  const row = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      paymentPaypalEnabled: true,
      paymentPaypalClientId: true,
      paymentPaypalClientSecret: true,
      paymentPaypalMode: true,
    },
  });
  if (!row?.paymentPaypalEnabled) return null;
  if (!row.paymentPaypalClientId || !row.paymentPaypalClientSecret) return null;
  return {
    enabled: true,
    clientId: row.paymentPaypalClientId,
    clientSecret: row.paymentPaypalClientSecret,
    mode: (row.paymentPaypalMode === 'live' ? 'live' : 'sandbox') as 'live' | 'sandbox',
  };
}

/**
 * Get an access token, caching for ~9 minutes (PayPal tokens last 9-10
 * hours; we cache short to react faster to credential rotation).
 */
async function getAccessToken(s: Settings): Promise<string | null> {
  const cacheKey = `${s.mode}:${s.clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const auth = Buffer.from(`${s.clientId}:${s.clientSecret}`).toString('base64');
  try {
    const res = await fetch(`${apiBase(s.mode)}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) {
      console.error('[paypal] token failed', res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    tokenCache.set(cacheKey, {
      token: json.access_token,
      expiresAt: Date.now() + 9 * 60_000,
    });
    return json.access_token;
  } catch (e) {
    console.error('[paypal] token network error', e);
    return null;
  }
}

export async function createPaypalIntent(
  input: CreateIntentInput,
): Promise<CreateIntentResult> {
  const settings = await loadSettings();
  if (!settings) return { ok: false, reason: 'paypal_not_configured' };

  const amountUsd = Number(input.amount);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false, reason: 'invalid_amount' };
  }
  if (amountUsd < 1) return { ok: false, reason: 'amount_below_minimum' };

  const token = await getAccessToken(settings);
  if (!token) return { ok: false, reason: 'paypal_auth_failed' };

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
  const intent = await prisma.paymentIntent.create({
    data: {
      reference: input.reference,
      userId: input.userId,
      gateway: 'paypal',
      amount: new Prisma.Decimal(amountUsd),
      purpose: input.purpose ?? 'wallet_topup',
      cryptoAsset: 'USD',
      cryptoAmount: amountUsd.toFixed(2),
      expiresAt,
    },
  });

  const base = appBaseUrl();
  const brand = await getBranding();
  const orderBody = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: intent.id,
        custom_id: intent.id,
        invoice_id: intent.reference,
        amount: {
          currency_code: 'USD',
          value: amountUsd.toFixed(2),
        },
        description: `Wallet top-up · ${intent.reference}`,
      },
    ],
    application_context: {
      brand_name: brand.siteName,
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      return_url: `${base}/api/payment/paypal/return?intent=${intent.id}`,
      cancel_url: input.cancelUrl?.trim() || `${base}/user/wallet?payment=cancelled`,
    },
  };
  if (input.successUrl?.trim()) {
    const successPath = new URL(input.successUrl.trim(), base).pathname + new URL(input.successUrl.trim(), base).search;
    orderBody.application_context.return_url = `${base}/api/payment/paypal/return?intent=${intent.id}&next=${encodeURIComponent(successPath)}`;
  }

  let createRes: Response;
  try {
    createRes = await fetch(`${apiBase(settings.mode)}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': intent.id,
      },
      body: JSON.stringify(orderBody),
    });
  } catch (e) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: 'FAILED',
        gatewayPayload: `network: ${e instanceof Error ? e.message : 'unknown'}`,
      },
    });
    return { ok: false, reason: 'paypal_network_error' };
  }

  if (!createRes.ok) {
    const text = await createRes.text();
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'FAILED', gatewayPayload: `http_${createRes.status}: ${text.slice(0, 500)}` },
    });
    return { ok: false, reason: `paypal_create_failed_${createRes.status}` };
  }

  const order = (await createRes.json()) as {
    id: string;
    status: string;
    links?: Array<{ rel: string; href: string }>;
  };
  const approveLink = order.links?.find((l) => l.rel === 'approve' || l.rel === 'payer-action');
  if (!approveLink) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: 'FAILED',
        gatewayPayload: `no_approve_link: ${JSON.stringify(order).slice(0, 500)}`,
      },
    });
    return { ok: false, reason: 'paypal_no_approve_link' };
  }

  // We store the PayPal order id in txHash temporarily so the return /
  // capture handler can look us up by intent id. (We'll overwrite txHash
  // with the capture id on confirmation.)
  await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: {
      externalUrl: approveLink.href,
      txHash: order.id, // PayPal order id (replaced with capture id later)
      gatewayPayload: JSON.stringify({ orderId: order.id, status: order.status }).slice(0, 1000),
    },
  });

  const payload: RedirectPayload = { kind: 'redirect', url: approveLink.href };
  return { ok: true, payload };
}

/**
 * Capture an approved PayPal order. Idempotent — calling again on an
 * already-captured order is a no-op (PayPal returns 422 which we treat
 * as success since our intent.status will already be CONFIRMED).
 */
export async function captureAndCreditPaypalOrder(input: {
  intentId: string;
  paypalOrderId?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const settings = await loadSettings();
  if (!settings) return { ok: false, reason: 'paypal_not_configured' };

  const intent = await prisma.paymentIntent.findUnique({
    where: { id: input.intentId },
  });
  if (!intent) return { ok: false, reason: 'intent_not_found' };
  if (intent.status === 'CONFIRMED') return { ok: true };
  const orderId = input.paypalOrderId ?? intent.txHash;
  if (!orderId) return { ok: false, reason: 'no_order_id' };

  const token = await getAccessToken(settings);
  if (!token) return { ok: false, reason: 'paypal_auth_failed' };

  let captureRes: Response;
  try {
    captureRes = await fetch(`${apiBase(settings.mode)}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Prefer minimal response and idempotency.
        'PayPal-Request-Id': intent.id,
      },
      body: '',
    });
  } catch (e) {
    return { ok: false, reason: `network_${e instanceof Error ? e.message : 'unknown'}` };
  }

  // 422 with status=COMPLETED happens when the order was already captured.
  // We treat any 2xx OR 422-already-captured as success.
  if (!captureRes.ok && captureRes.status !== 422) {
    const text = await captureRes.text();
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { gatewayPayload: `capture_${captureRes.status}: ${text.slice(0, 500)}` },
    });
    return { ok: false, reason: `capture_failed_${captureRes.status}` };
  }

  let payload: {
    id?: string;
    status?: string;
    purchase_units?: Array<{
      payments?: { captures?: Array<{ id: string; status: string }> };
    }>;
  };
  try {
    payload = await captureRes.json();
  } catch {
    payload = {};
  }

  const captureId = payload.purchase_units?.[0]?.payments?.captures?.[0]?.id;
  const captureStatus = payload.purchase_units?.[0]?.payments?.captures?.[0]?.status;
  if (captureStatus && captureStatus !== 'COMPLETED' && captureStatus !== 'PENDING') {
    return { ok: false, reason: `capture_status_${captureStatus.toLowerCase()}` };
  }

  // Credit using the existing helper (idempotent).
  const { creditWalletForIntent } = await import('./credit');
  const result = await creditWalletForIntent({
    intentId: intent.id,
    txHash: captureId ?? intent.txHash,
  });
  if (!result.ok) return { ok: false, reason: result.reason };
  return { ok: true };
}

/**
 * Verify a PayPal webhook signature. Used by the webhook route to make
 * sure incoming notifications actually came from PayPal.
 */
export async function verifyPaypalWebhookSignature(input: {
  webhookId: string;
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  const settings = await loadSettings();
  if (!settings) return false;
  if (!input.webhookId) return false;
  const token = await getAccessToken(settings);
  if (!token) return false;

  // PayPal headers we forward to verify-webhook-signature endpoint.
  const transmissionId = input.headers.get('paypal-transmission-id');
  const transmissionTime = input.headers.get('paypal-transmission-time');
  const certUrl = input.headers.get('paypal-cert-url');
  const authAlgo = input.headers.get('paypal-auth-algo');
  const transmissionSig = input.headers.get('paypal-transmission-sig');
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }
  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(input.rawBody);
  } catch {
    return false;
  }
  try {
    const res = await fetch(`${apiBase(settings.mode)}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook_id: input.webhookId,
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_event: webhookEvent,
      }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { verification_status?: string };
    return json.verification_status === 'SUCCESS';
  } catch {
    return false;
  }
}
