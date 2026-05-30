/**
 * Stripe gateway (Checkout Sessions).
 *
 * Why Checkout Sessions instead of Payment Intents:
 *   - No card form on our side → less PCI surface.
 *   - Apple Pay / Google Pay / multiple card brands enabled by Stripe
 *     dashboard, no extra UI work.
 *   - Webhook is the single source of truth for state transitions.
 *
 * Flow:
 *   1. createStripeIntent → POST /v1/checkout/sessions, redirect user.
 *   2. User completes payment on Stripe-hosted page.
 *   3. Webhook event `checkout.session.completed` triggers wallet credit.
 *   4. Browser redirected back to /user/wallet?payment=success.
 *
 * Constraints:
 *   - DO NOT touch supplier flow.
 *   - Wallet credit goes through creditWalletForIntent (idempotent).
 */
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import type { CreateIntentInput, CreateIntentResult, RedirectPayload } from './types';

type Settings = {
  enabled: boolean;
  secretKey: string;
  publishableKey: string;
  webhookSecret: string | null;
};

let cachedClient: { secret: string; client: Stripe } | null = null;

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
      paymentStripeEnabled: true,
      paymentStripeSecretKey: true,
      paymentStripePublishableKey: true,
      paymentStripeWebhookSecret: true,
    },
  });
  if (!row?.paymentStripeEnabled) return null;
  if (!row.paymentStripeSecretKey || !row.paymentStripePublishableKey) return null;
  return {
    enabled: true,
    secretKey: row.paymentStripeSecretKey,
    publishableKey: row.paymentStripePublishableKey,
    webhookSecret: row.paymentStripeWebhookSecret ?? null,
  };
}

function client(s: Settings): Stripe {
  if (cachedClient && cachedClient.secret === s.secretKey) return cachedClient.client;
  const next = new Stripe(s.secretKey, {
    // Pin the API version so a Stripe-side change doesn't suddenly affect
    // our webhook payload shape. SDK v22 pins to '2026-05-27.dahlia'.
    apiVersion: '2026-05-27.dahlia',
    typescript: true,
  });
  cachedClient = { secret: s.secretKey, client: next };
  return next;
}

export async function createStripeIntent(
  input: CreateIntentInput,
): Promise<CreateIntentResult> {
  const settings = await loadSettings();
  if (!settings) return { ok: false, reason: 'stripe_not_configured' };

  const amountUsd = Number(input.amount);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false, reason: 'invalid_amount' };
  }
  if (amountUsd < 1) return { ok: false, reason: 'amount_below_minimum' };

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
  const intent = await prisma.paymentIntent.create({
    data: {
      reference: input.reference,
      userId: input.userId,
      gateway: 'stripe',
      amount: new Prisma.Decimal(amountUsd),
      cryptoAsset: 'USD',
      cryptoAmount: amountUsd.toFixed(2),
      expiresAt,
    },
  });

  const stripe = client(settings);
  const base = appBaseUrl();

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amountUsd * 100), // cents
            product_data: {
              name: 'Wallet top-up',
              description: `Reference ${intent.reference}`,
            },
          },
        },
      ],
      // We pass our intent id BOTH ways so the webhook handler doesn't
      // depend on Stripe's payment_intent metadata flow.
      client_reference_id: intent.id,
      metadata: { intent_id: intent.id, reference: intent.reference },
      payment_intent_data: {
        metadata: { intent_id: intent.id, reference: intent.reference },
      },
      success_url: `${base}/user/wallet?payment=success&intent=${intent.id}`,
      cancel_url: `${base}/user/wallet?payment=cancelled`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'create_failed';
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'FAILED', gatewayPayload: msg.slice(0, 1000) },
    });
    return { ok: false, reason: `stripe_create_failed_${msg.slice(0, 80)}` };
  }

  if (!session.url) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'FAILED', gatewayPayload: 'no_session_url' },
    });
    return { ok: false, reason: 'stripe_no_url' };
  }

  await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: {
      externalUrl: session.url,
      txHash: session.id, // checkout session id, used by webhook handler
      gatewayPayload: JSON.stringify({ sessionId: session.id }).slice(0, 1000),
    },
  });

  const payload: RedirectPayload = { kind: 'redirect', url: session.url };
  return { ok: true, payload };
}

/**
 * Verify the incoming webhook signature using the official Stripe SDK
 * helper. Returns the parsed event or null.
 */
export async function verifyStripeWebhook(
  rawBody: string,
  signature: string | null,
): Promise<Stripe.Event | null> {
  if (!signature) return null;
  const settings = await loadSettings();
  if (!settings || !settings.webhookSecret) return null;
  const stripe = client(settings);
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, settings.webhookSecret);
  } catch (e) {
    console.error('[stripe] verifyWebhook failed', e instanceof Error ? e.message : e);
    return null;
  }
}
