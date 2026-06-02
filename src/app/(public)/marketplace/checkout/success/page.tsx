import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function MarketplaceCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const checkout = token
    ? await prisma.marketplaceCheckout.findUnique({
        where: { token },
        select: { status: true, orderType: true, orderId: true, errorMessage: true },
      })
    : null;

  return (
    <section className="mx-auto max-w-2xl px-6 py-20 text-center">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
        Marketplace checkout
      </span>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink">
        Payment received.
      </h1>
      <p className="mt-4 font-serif text-lg italic text-ink-muted">
        {checkout?.status === 'COMPLETED'
          ? 'Your order has been created successfully.'
          : 'We are finalizing your order. This usually takes a few seconds.'}
      </p>
      {checkout?.errorMessage && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {checkout.errorMessage}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/marketplace"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-ink"
        >
          Back to marketplace
        </Link>
        {checkout?.orderType && checkout.orderId && (
          <Link
            href={`/track?q=${encodeURIComponent(checkout.orderId)}`}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-primary-600"
          >
            Track order
          </Link>
        )}
      </div>
    </section>
  );
}

