import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  loadUsdtPortalSettings,
  verifyUsdtPortalTransaction,
} from '@/lib/payment/usdt-portal';
import { creditWalletForIntent } from '@/lib/payment/credit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/payment/usdt-portal/callback
 *
 * Receives form-encoded payment notifications from USDT Portal. Mirrors
 * the response format of their PHP reference handler so the merchant
 * panel "Test Callback" button works exactly the same way.
 *
 * Reference: https://github.com/usdtportal/DHRU-PHP-API-usdtportal.com
 *
 * Security:
 *   - Validates `email` + `callback_url_password` against our stored
 *     settings (constant-time-style comparison).
 *   - Re-confirms the transaction with USDT Portal's status API before
 *     crediting (defense-in-depth: prevents a bad actor from spoofing
 *     callbacks even if they guess the password).
 *   - Idempotent via creditWalletForIntent + transaction_id de-dup.
 */
function ok(payload: Record<string, unknown>) {
  return NextResponse.json(payload);
}

function constantEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const settings = await loadUsdtPortalSettings();
  if (!settings) {
    return ok({ is_success: false, code: 503, message: 'Module Not Activated' });
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return ok({ is_success: false, code: 400, message: 'Empty body' });
  }
  if (!raw.trim()) return ok({ is_success: false, code: 400, message: 'Empty body' });

  // Parse form-urlencoded body.
  const params = new URLSearchParams(raw);
  const get = (k: string) => params.get(k) ?? '';

  // ── Test callback handshake (called from merchant panel) ───────
  if (get('test_callback')) {
    if (
      !constantEquals(get('email'), settings.email) ||
      !constantEquals(get('callback_url_password'), settings.callbackPassword)
    ) {
      return ok({
        is_success: false,
        code: 403,
        message:
          'Credentials no match. Recheck Email + Callback password in admin Payments page.',
      });
    }
    return ok({
      is_success: true,
      code: 200,
      message: 'Credentials match. Callback is correctly set.',
      version: 1.0,
    });
  }

  // ── Real callback ──────────────────────────────────────────────
  const required = [
    'order_id',
    'transaction_id',
    'amount_with_commission',
    'fee',
    'user_email',
    'txn_hash',
    'received_timestamp',
    'email',
    'callback_url_password',
  ];
  for (const k of required) {
    if (!params.has(k)) {
      return ok({ is_success: false, code: 400, message: 'What are you doing here?' });
    }
  }

  if (
    !constantEquals(get('email'), settings.email) ||
    !constantEquals(get('callback_url_password'), settings.callbackPassword)
  ) {
    return ok({
      is_success: false,
      code: 403,
      message: 'Credentials no match.',
    });
  }

  const orderId = get('order_id');
  const transactionId = get('transaction_id');
  const amount = get('amount') || get('amount_with_commission');
  const txnHash = get('txn_hash');

  // Idempotency: refuse if this txn_hash already credited a different intent.
  const existing = await prisma.paymentIntent.findFirst({
    where: { txHash: txnHash, status: 'CONFIRMED' },
    select: { id: true },
  });
  if (existing && existing.id !== orderId) {
    return ok({
      is_success: false,
      code: 406,
      message: 'Txid already located in database',
    });
  }

  const intent = await prisma.paymentIntent.findFirst({
    where: { id: orderId, gateway: 'usdt_portal' },
  });
  if (!intent) {
    return ok({ is_success: false, code: 404, message: 'Order not found' });
  }
  if (intent.status === 'CONFIRMED') {
    return ok({
      is_success: false,
      code: 405,
      message: 'Order already paid',
    });
  }

  // Defense in depth: confirm the transaction with USDT Portal directly.
  const verified = await verifyUsdtPortalTransaction(transactionId, amount, settings);
  if (!verified) {
    return ok({
      is_success: false,
      code: 406,
      message: 'USDT Portal status claims transaction is unpaid or amount mismatch',
    });
  }

  const result = await creditWalletForIntent({
    intentId: intent.id,
    txHash: txnHash,
  });
  if (!result.ok) {
    return ok({
      is_success: false,
      code: 500,
      message: `Credit failed: ${result.reason}`,
    });
  }

  return ok({
    is_success: true,
    code: 200,
    message: `Credits Added - ${amount}`,
  });
}

// USDT Portal hits this endpoint via POST; reject GET clearly.
export function GET() {
  return ok({ is_success: false, code: 405, message: 'POST only' });
}
