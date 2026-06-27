import { prisma } from '@/lib/db';
import { toNum } from '@/lib/supplier-sync/money';

const MARKETPLACE_REF_PREFIX = 'MKT-';

export function isMarketplacePaymentReference(reference: string): boolean {
  return reference.startsWith(MARKETPLACE_REF_PREFIX);
}

/**
 * Last gate before an order is sent to the supplier API.
 * Wallet orders must have a PAYMENT ledger row; marketplace guest orders must
 * have a completed checkout backed by a confirmed payment intent.
 */
export async function assertOrderPaidBeforeSupplierSubmit(
  orderId: string,
  kind: 'imei' | 'server',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const checkout = await prisma.marketplaceCheckout.findFirst({
    where: { orderId, orderType: kind },
    include: { paymentIntent: true },
  });

  if (checkout) {
    if (checkout.status !== 'COMPLETED') {
      return { ok: false, error: 'Marketplace checkout not completed' };
    }
    const intent = checkout.paymentIntent;
    if (!intent) {
      return { ok: false, error: 'Marketplace order missing payment intent' };
    }
    if (intent.purpose !== 'marketplace') {
      return { ok: false, error: 'Invalid payment purpose for marketplace order' };
    }
    if (intent.status !== 'CONFIRMED') {
      return { ok: false, error: 'Marketplace payment not confirmed' };
    }
    if (!isMarketplacePaymentReference(intent.reference)) {
      return { ok: false, error: 'Invalid marketplace payment reference' };
    }
    const paid = toNum(intent.amount);
    const quoted = toNum(checkout.quotedAmount);
    if (Math.abs(paid - quoted) >= 0.01) {
      return { ok: false, error: 'Marketplace payment amount mismatch' };
    }
    return { ok: true };
  }

  const ledger = await prisma.walletLedger.findFirst({
    where: { type: 'PAYMENT', referenceId: orderId },
    select: { id: true },
  });
  if (!ledger) {
    return { ok: false, error: 'Order has no recorded wallet payment' };
  }

  return { ok: true };
}
