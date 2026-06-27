/**
 * Invoice service.
 *
 * Creates lightweight invoice records for wallet top-ups and (optionally)
 * orders. Strictly additive — invoices are a read model generated ALONGSIDE
 * existing events. They never block or modify the order / supplier flow.
 *
 * Invoice creation is idempotent per (refType, refId): calling it twice for
 * the same reference returns the existing invoice.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getBranding } from '@/lib/branding';

type CreateInvoiceInput = {
  userId: string;
  kind: 'TOPUP' | 'ORDER';
  amount: number | string | Prisma.Decimal;
  description: string;
  refType?: string | null;
  refId?: string | null;
  orderCode?: string | null;
  buyerEmail?: string | null;
  buyerName?: string | null;
};

/**
 * Generate the next invoice number for the current year, using the
 * configured brand prefix. Format: PREFIX-YYYY-000123 (zero-padded 6).
 */
async function nextInvoiceNumber(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const yearPrefix = `${prefix}-${year}-`;

  // Find the highest existing sequence for this prefix+year.
  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: yearPrefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  let seq = 1;
  if (last) {
    const tail = last.number.slice(yearPrefix.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${yearPrefix}${String(seq).padStart(6, '0')}`;
}

/**
 * Create an invoice (idempotent per refType+refId). Returns the invoice id.
 * Never throws out of the caller's main flow — wrap your call in try/catch
 * or use void if you want pure fire-and-forget.
 */
export async function createInvoice(input: CreateInvoiceInput): Promise<{ id: string; number: string } | null> {
  try {
    // Idempotency: if an invoice already exists for this reference, return it.
    if (input.refType && input.refId) {
      const existing = await prisma.invoice.findFirst({
        where: { refType: input.refType, refId: input.refId },
        select: { id: true, number: true },
      });
      if (existing) return existing;
    }

    const [brand, user] = await Promise.all([
      getBranding(),
      prisma.user.findUnique({
        where: { id: input.userId },
        select: { name: true, email: true },
      }),
    ]);

    const number = await nextInvoiceNumber(brand.invoicePrefix);
    const amount =
      input.amount instanceof Prisma.Decimal
        ? input.amount
        : new Prisma.Decimal(input.amount);

    const invoice = await prisma.invoice.create({
      data: {
        number,
        userId: input.userId,
        kind: input.kind,
        amount,
        description: input.description,
        refType: input.refType ?? null,
        refId: input.refId ?? null,
        orderCode: input.orderCode ?? null,
        sellerName: brand.siteName,
        sellerEmail: brand.supportEmail,
        buyerName: input.buyerName ?? user?.name ?? null,
        buyerEmail: input.buyerEmail ?? user?.email ?? null,
      },
      select: { id: true, number: true },
    });

    return invoice;
  } catch (e) {
    console.error('[invoice] create failed', e);
    return null;
  }
}
