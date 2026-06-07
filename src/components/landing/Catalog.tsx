'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';
import { RichText } from './RichText';
import type { CatalogServiceRow, ServiceCatalogContent } from '@/lib/cms-types';

type Props = {
  content: ServiceCatalogContent;
};

export function Catalog({ content }: Props) {
  const [tab, setTab] = React.useState<'imei' | 'server'>('imei');
  const imeiServices = content.imeiServices ?? [];
  const serverServices = content.serverServices ?? [];
  const data = tab === 'imei' ? imeiServices : serverServices;

  const footerText = (content.footerText ?? '{count} entries shown').replace(
    '{count}',
    String(data.length),
  );

  return (
    <section id="catalog" className="relative">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-32">
        <Reveal className="mb-12 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            {content.eyebrow && (
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                {content.eyebrow}
              </span>
            )}
            {content.heading && (
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-[56px] lg:leading-[1.02]">
                <RichText text={content.heading} />
              </h2>
            )}
            {content.subhead && (
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink/70">{content.subhead}</p>
            )}
          </div>

          <div className="lg:col-span-5 lg:justify-self-end">
            <div className="inline-flex rounded-full border border-line bg-paper p-1">
              {([
                { key: 'imei' as const, label: content.imeiTabLabel ?? 'Unlock services', count: imeiServices.length },
                { key: 'server' as const, label: content.serverTabLabel ?? 'Remote services', count: serverServices.length },
              ]).map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
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

        <div className="hidden border-b border-ink/15 px-2 py-3 text-[10px] uppercase tracking-[0.18em] text-ink-muted lg:grid lg:grid-cols-12 lg:gap-4">
          <div className="col-span-1 font-mono">Ref.</div>
          <div className="col-span-6 font-mono">Service</div>
          <div className="col-span-2 font-mono">Delivery</div>
          <div className="col-span-2 font-mono text-right">Price</div>
          <div className="col-span-1" />
        </div>

        <div className="divide-y divide-line border-b border-line">
          {data.length === 0 ? (
            <div className="px-2 py-12 text-center font-serif text-sm italic text-ink-muted">
              No services in this tab yet. Add rows in Landing builder → Service catalog.
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {data.map((row, idx) => (
                <ServiceLine
                  key={`${tab}-${row.ref}-${idx}`}
                  row={row}
                  idx={idx}
                  accent={tab === 'imei' ? 'ink' : 'blue'}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          {footerText && (
            <p className="font-serif text-[15px] italic text-ink-muted">{footerText}</p>
          )}
          {content.catalogLinkText && content.catalogLinkHref && (
            <a
              href={content.catalogLinkHref}
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ink"
            >
              <span className="border-b border-ink pb-0.5">{content.catalogLinkText}</span>
              <ArrowUpRight
                weight="bold"
                size={14}
                className="transition-transform group-hover:rotate-45"
              />
            </a>
          )}
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
  row: CatalogServiceRow;
  idx: number;
  accent: 'ink' | 'blue';
}) {
  const orderHref = row.orderHref || '#';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: idx * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <div className="grid grid-cols-12 gap-4 px-2 py-5 transition-colors duration-300 hover:bg-paper-100 lg:py-6">
        <div className="col-span-12 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted lg:col-span-1 lg:block">
          <span>{row.ref}</span>
        </div>

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
          <p className="mt-1 font-serif text-[14px] italic text-ink-muted lg:text-[15px]">{row.meta}</p>
        </div>

        <div className="col-span-6 lg:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted lg:hidden">Delivery</div>
          <div className="mt-0.5 font-mono text-sm font-medium text-ink lg:mt-0">{row.delivery}</div>
        </div>

        <div className="col-span-6 text-right lg:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted lg:hidden">Price</div>
          <div className="mt-0.5 font-display text-base font-extrabold tracking-tight text-ink lg:mt-0 lg:text-lg">
            {row.price}
          </div>
        </div>

        <div className="col-span-12 flex items-center justify-end lg:col-span-1">
          <a
            href={orderHref}
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
          </a>
        </div>
      </div>

      <span className="absolute bottom-0 left-0 h-px w-0 bg-ink transition-all duration-500 group-hover:w-full" />
    </motion.div>
  );
}
