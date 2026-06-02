'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import {
  LiveOrderTicket,
  ConsoleLog,
  StatsDashboard,
  PhoneUnlock,
} from '../visuals';
import { RichText } from '../RichText';

type Props = {
  content: {
    eyebrow?: unknown;
    heading?: unknown;
    subhead?: unknown;
    ctaText?: unknown;
    ctaHref?: unknown;
    secondaryText?: unknown;
    secondaryHref?: unknown;
    visualVariant?: unknown;
    bgImageUrl?: unknown;
  };
  /** Resolved layout variant (from settings). Falls back to content.visualVariant, then 'ticket'. */
  variant?: string | null;
};

export function DynamicHero({ content, variant }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const yLeft = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const yRight = useTransform(scrollYProgress, [0, 1], ['0%', '32%']);

  const eyebrow = (content.eyebrow as string) ?? '';
  const heading = (content.heading as string) ?? '';
  const subhead = (content.subhead as string) ?? '';
  const ctaText = (content.ctaText as string) ?? 'Get started';
  const ctaHref = (content.ctaHref as string) ?? '#';
  const secondaryText = (content.secondaryText as string) ?? '';
  const secondaryHref = (content.secondaryHref as string) ?? '#';
  // Two independent axes (Opsi B):
  //   structural layout  ← settings.variant (standard | split-image | minimal-center)
  //   animated visual    ← content.visualVariant (ticket | console | dashboard | phone)
  // Backward compat: legacy settings.variant values like 'console' are no
  // longer valid structural variants (resolver returns null) → default to
  // 'standard'. The animated card still comes from content.visualVariant.
  const structural =
    variant === 'split-image' || variant === 'minimal-center' ? variant : 'standard';
  const visual = (content.visualVariant as string) ?? 'ticket';
  const heroImage = (content.bgImageUrl as string) ?? '';

  // ─── Variant: minimal-center — centered headline, no right column ──
  if (structural === 'minimal-center') {
    return (
      <section ref={ref} className="relative">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 blueprint opacity-50" />
          <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-16 text-center lg:pb-28 lg:pt-24">
            {eyebrow && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 inline-flex items-center gap-2 rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ink"
              >
                {eyebrow}
              </motion.div>
            )}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[clamp(2.4rem,6.4vw,5rem)] font-extrabold leading-[0.98] tracking-tightest text-ink"
            >
              <RichText text={heading} />
            </motion.h1>
            {subhead && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-ink/75"
              >
                <RichText text={subhead} />
              </motion.p>
            )}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                href={ctaHref}
                className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-primary-600"
              >
                {ctaText}
                <ArrowUpRight weight="bold" size={14} className="transition-transform duration-300 group-hover:rotate-45" />
              </Link>
              {secondaryText && (
                <Link href={secondaryHref} className="group inline-flex items-center gap-2 text-sm font-medium text-ink/75 hover:text-ink">
                  <span className="border-b border-ink/30 pb-0.5 transition-colors group-hover:border-ink">{secondaryText}</span>
                  <ArrowRight weight="bold" size={12} className="transition-transform group-hover:translate-x-1" />
                </Link>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  // ─── Variant: split-image — text left, image right ─────────────
  if (structural === 'split-image') {
    return (
      <section ref={ref} className="relative">
        <div className="relative overflow-hidden">
          <div className="relative mx-auto grid max-w-[1400px] grid-cols-12 items-center gap-x-6 gap-y-12 px-6 pb-20 pt-12 lg:gap-x-10 lg:px-10 lg:pb-28 lg:pt-16">
            <motion.div style={{ y: yLeft }} className="col-span-12 lg:col-span-6">
              {eyebrow && (
                <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ink">
                  {eyebrow}
                </div>
              )}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="font-display text-[clamp(2.2rem,5.4vw,4.6rem)] font-extrabold leading-[0.98] tracking-tightest text-ink"
              >
                <RichText text={heading} />
              </motion.h1>
              {subhead && (
                <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-ink/75">
                  <RichText text={subhead} />
                </p>
              )}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href={ctaHref}
                  className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-primary-600"
                >
                  {ctaText}
                  <ArrowUpRight weight="bold" size={14} className="transition-transform duration-300 group-hover:rotate-45" />
                </Link>
                {secondaryText && (
                  <Link href={secondaryHref} className="group inline-flex items-center gap-2 text-sm font-medium text-ink/75 hover:text-ink">
                    <span className="border-b border-ink/30 pb-0.5 transition-colors group-hover:border-ink">{secondaryText}</span>
                    <ArrowRight weight="bold" size={12} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                )}
              </div>
            </motion.div>
            <motion.div style={{ y: yRight }} className="col-span-12 lg:col-span-6">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-paper-100">
                {heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
                    Set content.bgImageUrl
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  // ─── Default: original two-column layout with animated visual ──
  return (
    <section ref={ref} className="relative">
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
        <span className="hidden md:block">Unlock Service Portal Operations</span>
      </motion.div>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 blueprint opacity-50" />

        <div className="relative mx-auto grid max-w-[1400px] grid-cols-12 gap-x-6 gap-y-12 px-6 pb-20 pt-12 lg:gap-x-10 lg:px-10 lg:pb-32 lg:pt-16">
          <motion.div style={{ y: yLeft }} className="col-span-12 lg:col-span-7">
            {eyebrow && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em]"
              >
                <span className="text-ink-soft">┌──</span>
                <span className="rounded-full border border-ink/15 px-3 py-1 text-ink">
                  {eyebrow}
                </span>
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[clamp(2.4rem,6.4vw,5.5rem)] font-extrabold leading-[0.96] tracking-tightest text-ink"
            >
              <RichText text={heading} />
            </motion.h1>

            {subhead && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                className="mt-10 max-w-xl text-[17px] leading-relaxed text-ink/75"
              >
                <RichText text={subhead} />
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Link
                href={ctaHref}
                className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-primary-600"
              >
                {ctaText}
                <ArrowUpRight
                  weight="bold"
                  size={14}
                  className="transition-transform duration-300 group-hover:rotate-45"
                />
              </Link>
              {secondaryText && (
                <Link
                  href={secondaryHref}
                  className="group inline-flex items-center gap-2 text-sm font-medium text-ink/75 hover:text-ink"
                >
                  <span className="border-b border-ink/30 pb-0.5 transition-colors group-hover:border-ink">
                    {secondaryText}
                  </span>
                  <ArrowRight weight="bold" size={12} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </motion.div>
          </motion.div>

          <motion.div style={{ y: yRight }} className="col-span-12 lg:col-span-5 lg:pt-12">
            {visual === 'console' ? (
              <ConsoleLog />
            ) : visual === 'dashboard' ? (
              <StatsDashboard />
            ) : visual === 'phone' ? (
              <PhoneUnlock />
            ) : (
              <LiveOrderTicket />
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
