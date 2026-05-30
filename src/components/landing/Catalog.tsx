'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';

type ServiceRow = {
  ref: string;
  title: string;
  meta: string; // device + carrier description
  delivery: string;
  price: string;
  popular?: boolean;
  tag?: string;
};

const imeiServices: ServiceRow[] = [
  {
    ref: 'A.205',
    title: 'iPhone iCloud Clean Removal',
    meta: 'all models · clean status only',
    delivery: '3–7 days',
    price: '$26.99',
    popular: true,
    tag: 'Most ordered',
  },
  {
    ref: 'A.101',
    title: 'Samsung S24 · T-Mobile USA',
    meta: 'network unlock · all variants',
    delivery: '1–48 hours',
    price: '$5.99',
  },
  {
    ref: 'A.118',
    title: 'iPhone IMEI check premium',
    meta: 'GSX · blacklist · sim-lock · warranty',
    delivery: 'instant',
    price: '$0.99',
  },
  {
    ref: 'A.142',
    title: 'Carrier unlock · universal',
    meta: 'AT&T · Verizon · EE · Vodafone',
    delivery: '2–24 hours',
    price: '$9.99',
  },
  {
    ref: 'A.087',
    title: 'Sprint USA premium unlock',
    meta: 'all models · including blacklisted',
    delivery: '24–72 hours',
    price: '$14.99',
  },
];

const serverServices: ServiceRow[] = [
  {
    ref: 'B.301',
    title: 'Samsung FRP bypass · remote',
    meta: 'all Galaxy models · session-based',
    delivery: '10–30 minutes',
    price: '$4.99',
    popular: true,
    tag: 'Fastest',
  },
  {
    ref: 'B.314',
    title: 'Xiaomi Mi Account removal',
    meta: 'Mi · Redmi · POCO · permanent',
    delivery: '15–60 minutes',
    price: '$7.99',
  },
  {
    ref: 'B.327',
    title: 'iPhone software repair',
    meta: 'DFU error · iTunes 9/14/4013 · boot loop',
    delivery: '20–90 minutes',
    price: '$6.99',
  },
  {
    ref: 'B.412',
    title: 'Firmware flash · official',
    meta: 'Samsung · Xiaomi · Vivo · OPPO · Realme',
    delivery: '15–45 minutes',
    price: '$4.49',
  },
  {
    ref: 'B.452',
    title: 'EFS / IMEI repair',
    meta: 'Qualcomm + MediaTek devices',
    delivery: '30–60 minutes',
    price: '$8.99',
  },
];

export function Catalog() {
  const [tab, setTab] = React.useState<'imei' | 'server'>('imei');
  const data = tab === 'imei' ? imeiServices : serverServices;

  return (
    <section id="catalog" className="relative">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-32">
        <Reveal className="mb-12 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              § 01 · Catalog
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-[56px] lg:leading-[1.02]">
              The bureau&rsquo;s <span className="font-serif italic font-normal">working</span> menu.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink/70">
              Two registers. One desk. Everything below is live, priced final, and synced
              automatically from upstream — when an operator drops support, the line disappears
              from this page.
            </p>
          </div>

          {/* Tab switcher — minimal, ledger-style */}
          <div className="lg:col-span-5 lg:justify-self-end">
            <div className="inline-flex rounded-full border border-line bg-paper p-1">
              {([
                { key: 'imei' as const, label: 'IMEI register', count: imeiServices.length },
                { key: 'server' as const, label: 'Server register', count: serverServices.length },
              ]).map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      'relative z-10 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors',
                      active ? 'text-paper' : 'text-ink/70 hover:text-ink',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="catalog-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-ink"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    {t.label}
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 font-mono text-[9px]',
                        active ? 'bg-paper/20 text-paper' : 'bg-ink/5 text-ink-muted',
                      )}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Header row of the table */}
        <div className="hidden border-b border-ink/15 px-2 py-3 text-[10px] uppercase tracking-[0.18em] text-ink-muted lg:grid lg:grid-cols-12 lg:gap-4">
          <div className="col-span-1 font-mono">Ref.</div>
          <div className="col-span-6 font-mono">Service</div>
          <div className="col-span-2 font-mono">Delivery</div>
          <div className="col-span-2 font-mono text-right">Price</div>
          <div className="col-span-1" />
        </div>

        {/* Lines */}
        <div className="divide-y divide-line border-b border-line">
          <AnimatePresence mode="popLayout">
            {data.map((row, idx) => (
              <ServiceLine
                key={`${tab}-${row.ref}`}
                row={row}
                idx={idx}
                accent={tab === 'imei' ? 'ink' : 'blue'}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom row */}
        <div className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="font-serif text-[15px] italic text-ink-muted">
            {data.length} entries shown · roughly 200+ live in the full catalog
          </p>
          <a
            href="#"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ink"
          >
            <span className="border-b border-ink pb-0.5">Open the full register</span>
            <ArrowUpRight
              weight="bold"
              size={14}
              className="transition-transform group-hover:rotate-45"
            />
          </a>
        </div>
      </div>
    </section>
  );
}

function ServiceLine({
  row,
  idx,
  accent,
}: {
  row: ServiceRow;
  idx: number;
  accent: 'ink' | 'blue';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: idx * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <div className="grid grid-cols-12 gap-4 px-2 py-5 transition-colors duration-300 hover:bg-paper-100 lg:py-6">
        {/* Ref number */}
        <div className="col-span-12 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted lg:col-span-1 lg:block">
          <span>{row.ref}</span>
        </div>

        {/* Title + meta */}
        <div className="col-span-12 lg:col-span-6">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-lg font-extrabold tracking-tight text-ink lg:text-xl">
              {row.title}
            </h3>
            {row.popular && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink">
                {row.tag ?? 'Popular'}
              </span>
            )}
          </div>
          <p className="mt-1 font-serif text-[14px] italic text-ink-muted lg:text-[15px]">
            {row.meta}
          </p>
        </div>

        {/* Delivery */}
        <div className="col-span-6 lg:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted lg:hidden">
            Delivery
          </div>
          <div className="mt-0.5 font-mono text-sm font-medium text-ink lg:mt-0">
            {row.delivery}
          </div>
        </div>

        {/* Price */}
        <div className="col-span-6 text-right lg:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted lg:hidden">
            Price
          </div>
          <div className="mt-0.5 font-display text-base font-extrabold tracking-tight text-ink lg:mt-0 lg:text-lg">
            {row.price}
          </div>
        </div>

        {/* Action */}
        <div className="col-span-12 flex items-center justify-end lg:col-span-1">
          <button
            className={cn(
              'group/btn inline-flex h-9 items-center justify-center gap-1 rounded-full px-4 font-mono text-[10px] font-bold uppercase tracking-wider transition-all',
              accent === 'ink'
                ? 'border border-ink/15 text-ink hover:border-ink hover:bg-ink hover:text-paper'
                : 'bg-primary-500 text-white hover:bg-primary-600',
            )}
          >
            Order
            <ArrowUpRight
              weight="bold"
              size={11}
              className="transition-transform duration-300 group-hover/btn:rotate-45"
            />
          </button>
        </div>
      </div>

      {/* Underline animation */}
      <span className="absolute bottom-0 left-0 h-px w-0 bg-ink transition-all duration-500 group-hover:w-full" />
    </motion.div>
  );
}
