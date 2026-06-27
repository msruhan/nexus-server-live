/**
 * Single source of truth for crediting wallet from a payment intent.
 *
 * Idempotent: called multiple times with the same intent id → only the
 * first call credits. Subsequent calls return ok=true with credited=false.
 *
 * Marketplace guest checkouts (purpose=marketplace) never credit the wallet;
 * payment is fulfilled synchronously into an order instead.
 */
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { fulfillMarketplaceCheckoutByIntent } from '@/lib/marketplace-checkout';

export async function creditWalletForIntent(input: {
  intentId: string;
  txHash?: string | null;
}): Promise<{ ok: true; credited: boolean; balance?: string } | { ok: false; reason: string }> {
  const intent = await prisma.paymentIntent.findUnique({
    where: { id: input.intentId },
    include: { marketplaceCheckout: { select: { id: true, status: true } } },
  });
  if (!intent) return { ok: false, reason: 'intent_not_found' };

  const isMarketplace =
    intent.purpose === 'marketplace' || Boolean(intent.marketplaceCheckout);

  if (isMarketplace) {
    if (intent.status === 'CONFIRMED') {
      if (intent.marketplaceCheckout?.status !== 'COMPLETED') {
        const result = await fulfillMarketplaceCheckoutByIntent(input.intentId, input.txHash);
        if (!result.ok) return { ok: false, reason: result.reason ?? 'marketplace_fulfill_failed' };
      }
      return { ok: true, credited: false };
    }
    if (intent.status === 'CANCELLED' || intent.status === 'EXPIRED' || intent.status === 'FAILED') {
      return { ok: false, reason: `intent_${intent.status.toLowerCase()}` };
    }

    const result = await fulfillMarketplaceCheckoutByIntent(input.intentId, input.txHash);
    if (!result.ok) return { ok: false, reason: result.reason ?? 'marketplace_fulfill_failed' };
    return { ok: true, credited: false };
  }

  if (intent.status === 'CONFIRMED') {
    return { ok: true, credited: false };
  }
  if (intent.status === 'CANCELLED' || intent.status === 'EXPIRED' || intent.status === 'FAILED') {
    return { ok: false, reason: `intent_${intent.status.toLowerCase()}` };
  }

  // Atomic credit + ledger + intent status flip (wallet top-up only).
  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId: intent.userId },
      update: {},
      create: { userId: intent.userId, balance: 0 },
    });
    const newBalance = wallet.balance.add(intent.amount);
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });

    await tx.walletLedger.create({
      data: {
        walletId: wallet.id,
        type: 'TOPUP',
        amount: intent.amount,
        balance: newBalance,
        description: `Top-up via ${intent.gateway}${input.txHash ? ` · ${input.txHash}` : ''}`,
        referenceId: intent.id,
      },
    });

    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        txHash: input.txHash ?? intent.txHash,
      },
    });

    return newBalance;
  });

  await logActivity({
    userId: intent.userId,
    action: 'payment.credited',
    entity: 'PaymentIntent',
    entityId: intent.id,
    metadata: {
      gateway: intent.gateway,
      amount: intent.amount.toString(),
      txHash: input.txHash ?? null,
    },
  });

  try {
    void import('@/lib/email/notify').then(({ notifyPaymentCredited }) =>
      notifyPaymentCredited({
        userId: intent.userId,
        amount: intent.amount.toString(),
        gateway: intent.gateway,
        txHash: input.txHash ?? null,
      }),
    );
  } catch {
    /* never affect the credit flow */
  }

  try {
    void import('@/lib/invoice/service').then(({ createInvoice }) =>
      createInvoice({
        userId: intent.userId,
        kind: 'TOPUP',
        amount: intent.amount.toString(),
        description: `Wallet top-up via ${intent.gateway}`,
        refType: 'PaymentIntent',
        refId: intent.id,
      }),
    );
  } catch {
    /* never affect the credit flow */
  }

  try {
    void import('@/lib/webhook/dispatcher').then(({ enqueueWebhook }) =>
      enqueueWebhook({
        userId: intent.userId,
        event: 'payment.credited',
        refType: 'PaymentIntent',
        refId: intent.id,
        data: {
          gateway: intent.gateway,
          amount: intent.amount.toString(),
          txHash: input.txHash ?? null,
          reference: intent.reference,
        },
      }),
    );
  } catch {
    /* never affect the credit flow */
  }

  return { ok: true, credited: true, balance: result.toString() };
}

export async function expireOldPendingIntents(): Promise<number> {
  const now = new Date();
  const r = await prisma.paymentIntent.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });

  await prisma.marketplaceCheckout.updateMany({
    where: {
      status: 'AWAITING_PAYMENT',
      paymentIntent: { status: 'EXPIRED' },
    },
    data: { status: 'FAILED', errorMessage: 'Payment window expired' },
  });

  return r.count;
}
