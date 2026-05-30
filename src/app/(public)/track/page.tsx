import type { Metadata } from 'next';
import { lookupOrderByCode } from '@/lib/order-tracker';
import { TrackForm } from './TrackForm';
import { TrackResult } from './TrackResult';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Track order — Nexus Server',
  description: 'Look up your IMEI or server order status using its order code.',
};

type Props = {
  searchParams: Promise<{ code?: string }>;
};

export default async function TrackPage({ searchParams }: Props) {
  const params = await searchParams;
  const code = (params.code ?? '').trim();
  const result = code ? await lookupOrderByCode(code) : null;
  const notFound = !!code && !result;

  return (
    <section className="mx-auto max-w-[1100px] px-6 py-16 lg:px-10 lg:py-24">
      <div className="border-b border-line pb-12">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          § Track order
        </span>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Public <span className="font-serif italic font-normal">order</span> tracker.
        </h1>
        <p className="mt-5 max-w-2xl font-serif text-lg italic leading-relaxed text-ink-muted">
          Drop in your order code and see live status. No login required. Anyone with
          the code can view it — keep it private if you don&rsquo;t want it shared.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[420px,1fr]">
        <TrackForm initialCode={code} />
        <div className="min-h-[200px]">
          {notFound && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-700">
                § Not found
              </div>
              <p className="mt-2 font-serif italic text-amber-900">
                We couldn&rsquo;t find an order with that code. Double-check it for typos —
                codes look like{' '}
                <code className="font-mono">ID-K7VN3P2WXR9M</code>.
              </p>
            </div>
          )}
          {result && <TrackResult result={result} />}
          {!code && !notFound && (
            <div className="rounded-2xl border border-line bg-paper-50 p-8 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                § How this works
              </div>
              <ul className="mx-auto mt-4 max-w-md space-y-3 text-left font-serif italic text-ink-muted">
                <li>1. Paste your order code (we sent it via email and shown after checkout).</li>
                <li>2. Hit lookup. The status updates whenever the supplier posts new info.</li>
                <li>3. Your IMEI is masked. Only the order owner sees the full result code.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
