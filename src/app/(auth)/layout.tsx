import Link from 'next/link';
import { guardAgainstBlockedIp } from '@/lib/ip-block-guard';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await guardAgainstBlockedIp();
  return (
    <main className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left side — form */}
      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-6 py-6 lg:px-10">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
          >
            ← Back to site
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            Recovero
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12 pt-4 lg:px-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>

      {/* Right side — editorial visual */}
      <aside className="relative hidden overflow-hidden bg-ink text-paper lg:block">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/60">
            § The hub · admissions
          </span>

          <div>
            <h2 className="font-display text-[clamp(2rem,4vw,4rem)] font-black leading-[0.95] tracking-tightest text-paper">
              Open the platform.{' '}
              <span className="font-serif italic font-normal text-primary-300">
                The kettle&rsquo;s on.
              </span>
            </h2>
            <p className="mt-6 max-w-md font-serif text-lg italic leading-relaxed text-paper/70">
              Free to register. Top-up from $1.00. The first docket can ship before your
              second sip.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 border-t border-paper/10 pt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/50">
            <span>Free account</span>
            <span>·</span>
            <span>No subscription</span>
            <span>·</span>
            <span>Polling cadence locked at 60s</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
