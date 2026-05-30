'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { Reveal, SplitWords } from '@/components/ui/Reveal';

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-ink text-paper">
      {/* Big number watermark */}
      <div className="pointer-events-none absolute -bottom-24 -right-10 select-none font-display text-[28rem] font-black leading-none text-paper/[0.04]">
        09
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Floating live activity strip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative border-b border-paper/10"
      >
        <div className="overflow-hidden">
          <div className="track animate-marquee-fast py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="mx-8 inline-flex items-center gap-3 whitespace-nowrap">
                <span className="live-dot" />
                Andre · iCloud removal · 12s ago
                <span className="text-paper/30">·</span>
                Sari · T-Mobile USA unlock · 38s ago
                <span className="text-paper/30">·</span>
                Rudi · FRP bypass · 1m ago
                <span className="text-paper/30">·</span>
                Dimas · Mi account removal · 2m ago
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="relative mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-32">
        <Reveal className="mb-8">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/60">
            § 07 · Open an account
          </span>
        </Reveal>

        <h2 className="font-display text-[clamp(2.6rem,7.6vw,7rem)] font-black leading-[0.95] tracking-tightest text-paper">
          <SplitWords text="Your first" />
          <br />
          <SplitWords text="docket can land" italic={[1]} />
          <br />
          <span className="text-primary-300">
            <SplitWords text="before your coffee" italic={[2]} />
          </span>
          <br />
          <SplitWords text="goes cold." italic={[1]} />
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-12 max-w-2xl font-serif text-xl italic leading-relaxed text-paper/75 lg:text-2xl"
        >
          Free to register. Top up from <span className="not-italic font-mono text-base font-bold text-paper">$1.00</span>.
          Wallet activates the moment your top-up clears. The first order can ship before
          you finish your second sip.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="mt-12 flex flex-wrap items-center gap-4"
        >
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full bg-paper px-7 py-4 text-sm font-semibold text-ink transition-colors hover:bg-primary-300"
          >
            Open account · 30 seconds
            <ArrowUpRight
              weight="bold"
              size={14}
              className="transition-transform group-hover:rotate-45"
            />
          </Link>
          <Link
            href="#catalog"
            className="group inline-flex items-center gap-2 text-sm font-medium text-paper/80 hover:text-paper"
          >
            <span className="border-b border-paper/40 pb-0.5 transition-colors group-hover:border-paper">
              Browse the register first
            </span>
          </Link>
        </motion.div>

        {/* Footer of CTA — colophon style */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-20 grid gap-6 border-t border-paper/10 pt-8 sm:grid-cols-3"
        >
          {[
            { label: 'No setup fee', body: 'Account creation is free, forever.' },
            { label: 'No subscription', body: 'You pay only when an order ships.' },
            { label: 'No lock-in', body: 'Withdraw remaining wallet balance anytime.' },
          ].map((item) => (
            <div key={item.label}>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-300">
                {item.label}
              </div>
              <div className="mt-1 font-serif text-base italic text-paper/80">{item.body}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
