'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { Reveal } from '@/components/ui/Reveal';
import { RichText } from '../RichText';

export function DynamicCta({
  content,
  variant,
}: {
  content: Record<string, unknown>;
  variant?: string | null;
}) {
  const eyebrow = (content.eyebrow as string) ?? '';
  const heading = (content.heading as string) ?? '';
  const subhead = (content.subhead as string) ?? '';
  const ctaText = (content.ctaText as string) ?? 'Open account';
  const ctaHref = (content.ctaHref as string) ?? '/register';
  const layout = variant ?? 'banner';

  // Boxed variant: contained dark card on a paper background.
  if (layout === 'boxed') {
    return (
      <section className="bg-paper-100">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-24">
          <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-paper lg:px-16 lg:py-20">
            <div className="pointer-events-none absolute -bottom-16 -right-6 select-none font-display text-[16rem] font-black leading-none text-paper/[0.05]">
              ✱
            </div>
            <div className="relative">
              {eyebrow && (
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/60">
                  {eyebrow}
                </span>
              )}
              <h2 className="mt-6 font-display text-[clamp(2rem,5vw,4rem)] font-black leading-[0.98] tracking-tightest text-paper">
                <RichText text={heading} />
              </h2>
              {subhead && (
                <p className="mt-6 max-w-xl font-serif text-lg italic leading-relaxed text-paper/75">
                  <RichText text={subhead} />
                </p>
              )}
              <div className="mt-10">
                <Link
                  href={ctaHref}
                  className="group inline-flex items-center gap-2 rounded-full bg-paper px-7 py-4 text-sm font-semibold text-ink transition-colors hover:bg-primary-300"
                >
                  {ctaText}
                  <ArrowUpRight weight="bold" size={14} className="transition-transform group-hover:rotate-45" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Split variant: heading left, subhead + CTA right.
  if (layout === 'split') {
    return (
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 px-6 py-24 lg:grid-cols-2 lg:px-10 lg:py-32">
          <div>
            {eyebrow && (
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/60">
                {eyebrow}
              </span>
            )}
            <h2 className="mt-6 font-display text-[clamp(2.4rem,6vw,5rem)] font-black leading-[0.95] tracking-tightest text-paper">
              <RichText text={heading} />
            </h2>
          </div>
          <div className="lg:pl-10">
            {subhead && (
              <p className="max-w-xl font-serif text-xl italic leading-relaxed text-paper/75">
                <RichText text={subhead} />
              </p>
            )}
            <div className="mt-10">
              <Link
                href={ctaHref}
                className="group inline-flex items-center gap-2 rounded-full bg-paper px-7 py-4 text-sm font-semibold text-ink transition-colors hover:bg-primary-300"
              >
                {ctaText}
                <ArrowUpRight weight="bold" size={14} className="transition-transform group-hover:rotate-45" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default: original full-bleed banner.
  return (
    <section className="relative overflow-hidden bg-ink text-paper">
      <div className="pointer-events-none absolute -bottom-24 -right-10 select-none font-display text-[28rem] font-black leading-none text-paper/[0.04]">
        ✱
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-32">
        {eyebrow && (
          <Reveal className="mb-8">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/60">
              {eyebrow}
            </span>
          </Reveal>
        )}

        <h2 className="font-display text-[clamp(2.6rem,7.6vw,7rem)] font-black leading-[0.95] tracking-tightest text-paper">
          <RichText text={heading} />
        </h2>

        {subhead && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-12 max-w-2xl font-serif text-xl italic leading-relaxed text-paper/75 lg:text-2xl"
          >
            <RichText text={subhead} />
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Link
            href={ctaHref}
            className="group inline-flex items-center gap-2 rounded-full bg-paper px-7 py-4 text-sm font-semibold text-ink transition-colors hover:bg-primary-300"
          >
            {ctaText}
            <ArrowUpRight
              weight="bold"
              size={14}
              className="transition-transform group-hover:rotate-45"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
