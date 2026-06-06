/**
 * GET /api/user/invoices/[id]/pdf
 *
 * Streams the invoice PDF. Owner-only (or admin). Additive read endpoint.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatUSD } from '@/lib/format';
import { buildInvoicePdf } from '@/lib/invoice/pdf';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const role = session.user.role as string;
  const isOwner = invoice.userId === session.user.id;
  const isAdmin = role === 'ADMIN' || role === 'SUB_ADMIN';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const pdf = await buildInvoicePdf({
      number: invoice.number,
      kind: invoice.kind,
      status: invoice.status,
      amount: formatUSD(invoice.amount),
      currency: invoice.currency,
      description: invoice.description,
      orderCode: invoice.orderCode,
      sellerName: invoice.sellerName ?? 'Recovero',
      sellerEmail: invoice.sellerEmail,
      buyerName: invoice.buyerName,
      buyerEmail: invoice.buyerEmail,
      issuedAt: invoice.issuedAt,
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    console.error('[invoice.pdf]', e);
    return NextResponse.json({ error: 'Failed to render PDF' }, { status: 500 });
  }
}
