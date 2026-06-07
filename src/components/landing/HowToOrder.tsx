'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  MagnifyingGlass,
  ShoppingCart,
  MapPin,
} from '@phosphor-icons/react/dist/ssr';
import { Reveal } from '@/components/ui/Reveal';
import { RichText } from './RichText';
import type { HowToOrderContent, HowToOrderStep } from '@/lib/cms-types';

const ICONS = {
  search: MagnifyingGlass,
  cart: ShoppingCart,
  map: MapPin,
} as const;

type Props = {
  content: HowToOrderContent;
};

export function HowToOrder({ content }: Props) {
  const steps = content.steps ?? [];

  return (
    <section id="how-to-order" className="relative border-t border-line bg-paper-50">
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:px-10 lg:py-28">
        <Reveal className="mb-14 text-center lg:mb-16">
          {content.eyebrow && (
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              {content.eyebrow}
            </span>
          )}
          {content.heading && (
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              <RichText text={content.heading} />
            </h2>
          )}
          {content.subhead && (
            <p className="mx-auto mt-4 max-w-2xl font-serif text-lg italic leading-relaxed text-ink-muted">
              {content.subhead}
            </p>
          )}
        </Reveal>

        {steps.length === 0 ? (
          <p className="text-center font-serif text-sm italic text-ink-muted">
            No steps yet. Add them in Landing builder → How to order.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, idx) => (
              <StepCard key={`${step.no}-${idx}`} step={step} idx={idx} />
            ))}
          </div>
        )}

        <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-4 text-center">
          {content.ctaBrowseHref && content.bottomBrowseLabel && (
            <Link
              href={content.ctaBrowseHref}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper hover:bg-primary-600"
            >
              {content.bottomBrowseLabel}
              <ArrowRight size={14} weight="bold" />
            </Link>
          )}
          {content.ctaTrackHref && content.bottomTrackLabel && (
            <Link
              href={content.ctaTrackHref}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-6 py-3 text-sm font-semibold text-ink hover:border-ink"
            >
              {content.bottomTrackLabel}
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function StepCard({ step, idx }: { step: HowToOrderStep; idx: number }) {
  const Icon = ICONS[step.icon ?? 'search'] ?? MagnifyingGlass;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col rounded-2xl border border-line bg-paper p-6 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-paper">
        <Icon size={22} weight="bold" />
      </div>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
        Step {step.no}
      </span>
      <h3 className="mt-2 font-display text-lg font-extrabold tracking-tight text-ink">{step.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{step.body}</p>
      {step.ctaHref && step.ctaLabel && (
        <Link
          href={step.ctaHref}
          className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider text-ink hover:text-primary-600"
        >
          {step.ctaLabel}
          <ArrowRight size={12} weight="bold" />
        </Link>
      )}
    </motion.div>
  );
}
