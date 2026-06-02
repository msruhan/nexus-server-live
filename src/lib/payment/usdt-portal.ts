/**
 * USDT Portal gateway (https://usdtportal.com).
 *
 * Wallet is USD-native. The user enters a USD amount; we convert to USDT
 * using the configured USD→USDT rate (default 1:1 since USDT is pegged).
 * Admin can adjust the rate in /admin/payments if they want to add a
 * small spread.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { CreateIntentInput, CreateIntentResult, RedirectPayload } from './types';

const GATEWAY_URL = 'https://usdtportal.com/api/';

type Settings = {
  enabled: boolean;
  email: string;
  apiKey: string;
  callbackPassword: string;
  usdtRate: number; // USD per 1 USDT (default 1.0 for 1:1 peg)
};

async function loadSettings(): Promise<Settings | null> {
  const row = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      paymentUsdtPortalEnabled: true,
      paymentUsdtPortalEmail: true,
      paymentUsdtPortalApiKey: true,
      paymentUsdtPortalCallbackPassword: true,
      paymentUsdtRate: true,
    },
  });
  if (!row?.paymentUsdtPortalEnabled) return null;
  if (!row.paymentUsdtPortalEmail || !row.paymentUsdtPortalApiKey) return null;
  if (!row.paymentUsdtPortalCallbackPassword) return null;
  return {
    enabled: true,
    email: row.paymentUsdtPortalEmail,
    apiKey: row.paymentUsdtPortalApiKey,
    callbackPassword: row.paymentUsdtPortalCallbackPassword,
    // Default 1:1 (USDT ≈ USD). Admin can set a spread if desired.
    usdtRate: row.paymentUsdtRate ? Number(row.paymentUsdtRate) : 1.0,
  };
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

export async function createUsdtPortalIntent(
  input: CreateIntentInput,
): Promise<CreateIntentResult> {
  const settings = await loadSettings();
  if (!settings) return { ok: false, reason: 'usdt_portal_not_configured' };

  const amountUsd = Number(input.amount);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false, reason: 'invalid_amount' };
  }
  // Convert USD → USDT using the configured rate.
  const usdtAmount = +(amountUsd / settings.usdtRate).toFixed(2);
  if (usdtAmount < 1) return { ok: false, reason: 'amount_below_minimum' };
  if (usdtAmount > 35000) return { ok: false, reason: 'amount_above_maximum' };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  if (!user?.email) return { ok: false, reason: 'user_email_missing' };

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const intent = await prisma.paymentIntent.create({
    data: {
      reference: input.reference,
      userId: input.userId,
      gateway: 'usdt_portal',
      amount: new Prisma.Decimal(amountUsd),
      cryptoAsset: 'USDT',
      cryptoAmount: usdtAmount.toFixed(2),
      expiresAt,
    },
  });

  const base = appBaseUrl();
  const args = new URLSearchParams({
    action: 'new',
    'merchant[email]': settings.email,
    'merchant[api_key]': settings.apiKey,
    'customer[user_email]': user.email,
    'customer[amount]': usdtAmount.toFixed(2),
    'customer[currency]': 'USD',
    order_id: intent.id,
    redirect_paid: input.successUrl?.trim() || `${base}/user/wallet?payment=success`,
    redirect_canceled: input.cancelUrl?.trim() || `${base}/user/wallet?payment=cancelled`,
  });

  let res: Response;
  try {
    res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: args.toString(),
    });
  } catch (e) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: 'FAILED',
        gatewayPayload: `network: ${e instanceof Error ? e.message : 'unknown'}`,
      },
    });
    return { ok: false, reason: 'usdt_portal_offline' };
  }

  if (res.status === 403) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'FAILED', gatewayPayload: 'http_403' },
    });
    return {
      ok: false,
      reason: 'Server IP not whitelisted on USDT Portal merchant panel',
    };
  }
  if (!res.ok) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'FAILED', gatewayPayload: `http_${res.status}` },
    });
    return { ok: false, reason: 'usdt_portal_offline' };
  }

  let json: { auth?: boolean; error?: boolean; url?: string; message?: string };
  try {
    json = await res.json();
  } catch {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'FAILED', gatewayPayload: 'invalid_json' },
    });
    return { ok: false, reason: 'usdt_portal_invalid_response' };
  }

  if (!json.auth || json.error || !json.url) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'FAILED', gatewayPayload: JSON.stringify(json).slice(0, 1000) },
    });
    return { ok: false, reason: json.message ?? 'usdt_portal_rejected' };
  }

  await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: {
      externalUrl: json.url,
      gatewayPayload: JSON.stringify({ created: true, message: json.message }).slice(0, 1000),
    },
  });

  const payload: RedirectPayload = { kind: 'redirect', url: json.url };
  return { ok: true, payload };
}

export async function verifyUsdtPortalTransaction(
  transactionId: string,
  amount: string,
  settings: Settings,
): Promise<boolean> {
  const args = new URLSearchParams({
    action: 'status',
    'merchant[email]': settings.email,
    'merchant[api_key]': settings.apiKey,
    transaction_id: transactionId,
  });
  try {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: args.toString(),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { transaction_status?: string; amount?: string | number };
    if (data.transaction_status !== 'paid') return false;
    if (data.amount === undefined || data.amount === null) return false;
    return Number(data.amount) === Number(amount);
  } catch {
    return false;
  }
}

export { loadSettings as loadUsdtPortalSettings };
