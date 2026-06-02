import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function MarketplaceCheckoutCancelPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-20 text-center">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
        Marketplace checkout
      </span>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink">
        Payment cancelled.
      </h1>
      <p className="mt-4 font-serif text-lg italic text-ink-muted">
        No worries — your order has not been submitted yet. You can retry anytime.
      </p>
      <div className="mt-8">
        <Link
          href="/marketplace"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-primary-600"
        >
          Back to marketplace
        </Link>
      </div>
    </section>
  );
}

