'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  CheckCircle,
} from '@phosphor-icons/react/dist/ssr';
import { SplitWords } from '@/components/ui/Reveal';
import {
  LiveOrderTicket,
  ConsoleLog,
  StatsDashboard,
  PhoneUnlock,
  type HeroVisualVariant,
} from './visuals';

export function Hero({ variant = 'ticket' }: { variant?: HeroVisualVariant }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const yLeft = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const yRight = useTransform(scrollYProgress, [0, 1], ['0%', '32%']);

  return (
    <section ref={ref} className="relative">
      {/* Top metadata bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="mx-auto flex max-w-[1400px] items-center justify-between border-b border-line px-6 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted lg:px-10"
      >
        <span className="flex items-center gap-2">
          <span className="live-dot" />
          <span>System nominal · 60s polling cadence</span>
        </span>
        <span className="hidden sm:block">Issue №{getEdition()} / {dateLabel()}</span>
        <span className="hidden md:block">Unlock Service Portal Operations</span>
      </motion.div>

      {/* Hero content */}
      <div className="relative overflow-hidden">
        {/* Subtle blueprint grid behind everything */}
        <div className="pointer-events-none absolute inset-0 blueprint opacity-50" />

        <div className="relative mx-auto grid max-w-[1400px] grid-cols-12 gap-x-6 gap-y-12 px-6 pb-20 pt-12 lg:gap-x-10 lg:px-10 lg:pb-32 lg:pt-16">
          {/* Left side — headline */}
          <motion.div style={{ y: yLeft }} className="col-span-12 lg:col-span-7">
            {/* Index marker */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em]"
            >
              <span className="text-ink-soft">┌──</span>
              <span className="rounded-full border border-ink/15 px-3 py-1 text-ink">
                Vol. 01 · The Reseller Edition
              </span>
            </motion.div>

            {/* The headline — mixed display sans + serif italic */}
            <h1 className="font-display text-[clamp(2.4rem,6.4vw,5.5rem)] font-extrabold leading-[0.96] tracking-tightest text-ink">
              <SplitWords text="A quiet desk for" />
              <br />
              <SplitWords text="loud, urgent" italic={[0]} />
              <br />
              <span className="relative inline-block">
                <SplitWords text="phone problems." italic={[0, 1]} />
                {/* Hand-drawn underline */}
                <motion.svg
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.2, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  viewBox="0 0 400 14"
                  className="absolute -bottom-2 left-0 h-3 w-full"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M2 9 C 80 2, 160 12, 240 6 S 380 4, 398 8"
                    stroke="rgb(var(--primary-500))"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </motion.svg>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.8 }}
              className="mt-10 max-w-xl text-[17px] leading-relaxed text-ink/75"
            >
              Nexus is a self-service unlock portal for resellers, technicians, and busy counters.
              You order an unlock, an iCloud removal, an FRP bypass — we hand it off to{' '}
              <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[12px] font-medium text-paper">
                DhruFusion
              </span>{' '}
              and watch it land. <span className="font-serif italic">No drama. No chasing.</span>
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Link
                href="#catalog"
                className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-primary-600"
              >
                Browse the catalog
                <ArrowUpRight
                  weight="bold"
                  size={14}
                  className="transition-transform duration-300 group-hover:rotate-45"
                />
              </Link>
              <Link
                href="#how-to-order"
                className="group inline-flex items-center gap-2 text-sm font-medium text-ink/75 hover:text-ink"
              >
                <span className="border-b border-ink/30 pb-0.5 transition-colors group-hover:border-ink">
                  See how to order
                </span>
                <ArrowRight
                  weight="bold"
                  size={12}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </motion.div>

            {/* Footnotes */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
              className="mt-14 grid grid-cols-3 gap-6 border-t border-line pt-6"
            >
              {[
                { kpi: '02:14', label: 'Median delivery, network unlocks' },
                { kpi: '98.7%', label: 'Closed successful, last 30 days' },
                { kpi: '12.4k', label: 'Counters, technicians, resellers' },
              ].map((f) => (
                <div key={f.label}>
                  <div className="font-display text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">
                    {f.kpi}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-muted">
                    {f.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right side — visual variant */}
          <motion.div
            style={{ y: yRight }}
            className="col-span-12 lg:col-span-5 lg:pt-12"
          >
            {variant === 'console' ? (
              <ConsoleLog />
            ) : variant === 'dashboard' ? (
              <StatsDashboard />
            ) : variant === 'phone' ? (
              <PhoneUnlock />
            ) : (
              <LiveOrderTicket />
            )}
          </motion.div>
        </div>

        {/* Section bottom marker */}
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft lg:px-10">
            <span>↓ Continue</span>
            <span className="hidden sm:block">Scroll for catalog, order steps, and notes from the desk</span>
            <span>p. 02</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function getEdition() {
  return '0524';
}

function dateLabel() {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}
