'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, MagnifyingGlass, ShoppingCart, MapPin } from '@phosphor-icons/react/dist/ssr';
import { Reveal } from '@/components/ui/Reveal';
import { RichText } from './RichText';

export type HowToOrderContent = {
  eyebrow?: string;
  heading?: string;
  subhead?: string;
  ctaBrowseHref?: string;
  ctaBrowseLabel?: string;
  ctaTrackHref?: string;
  ctaTrackLabel?: string;
};

const defaultSteps = [
  {
    no: '01',
    icon: MagnifyingGlass,
    title: 'Browse services',
    body: 'Explore IMEI and server tool categories on the marketplace. Compare prices, delivery windows, and required fields before you order.',
    cta: { href: '/marketplace', label: 'Open marketplace' },
  },
  {
    no: '02',
    icon: ShoppingCart,
    title: 'Place your order',
    body: 'Fill in the device details your service needs. Pay as a guest with supported gateways, or sign in to use your wallet balance.',
    cta: { href: '/marketplace', label: 'Start ordering' },
  },
  {
    no: '03',
    icon: MapPin,
    title: 'Track progress',
    body: 'Use your order code or account to follow status updates from submission through completion.',
    cta: { href: '/track', label: 'Track order' },
  },
];

type Props = {
  content?: HowToOrderContent;
};

export function HowToOrder({ content }: Props) {
  const eyebrow = content?.eyebrow ?? '§ How it works';
  const heading =
    content?.heading ?? 'Order in {italic:three simple steps}.';
  const subhead =
    content?.subhead ??
    'Browse the catalog, place your order as a guest or signed-in user, then track progress anytime.';

  const steps = defaultSteps.map((step) => ({
    ...step,
    cta: {
      href:
        step.no === '01'
          ? content?.ctaBrowseHref ?? step.cta.href
          : step.no === '03'
            ? content?.ctaTrackHref ?? step.cta.href
            : step.cta.href,
      label:
        step.no === '01'
          ? content?.ctaBrowseLabel ?? step.cta.label
          : step.no === '03'
            ? content?.ctaTrackLabel ?? step.cta.label
            : step.cta.label,
    },
  }));

  return (
    <section id="how-to-order" className="relative border-t border-line bg-paper-50">
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:px-10 lg:py-28">
        <Reveal className="mb-14 text-center lg:mb-16">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            {eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
            <RichText text={heading} />
          </h2>
          {subhead && (
            <p className="mx-auto mt-4 max-w-2xl font-serif text-lg italic leading-relaxed text-ink-muted">
              {subhead}
            </p>
          )}
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.no}
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
                <h3 className="mt-2 font-display text-lg font-extrabold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                <Link
                  href={step.cta.href}
                  className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider text-ink hover:text-primary-600"
                >
                  {step.cta.label}
                  <ArrowRight size={12} weight="bold" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-4 text-center">
          <Link
            href={content?.ctaBrowseHref ?? '/marketplace'}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper hover:bg-primary-600"
          >
            Browse marketplace
            <ArrowRight size={14} weight="bold" />
          </Link>
          <Link
            href={content?.ctaTrackHref ?? '/track'}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-6 py-3 text-sm font-semibold text-ink hover:border-ink"
          >
            Track an order
          </Link>
        </Reveal>
      </div>
    </section>
  );
}