'use client';

import { motion } from 'framer-motion';
import { Reveal } from '@/components/ui/Reveal';

type Item = { label: string; value: string; note?: string };

export function DynamicStats({ content }: { content: Record<string, unknown> }) {
  const items = (content.items as Item[]) ?? [];

  return (
    <section className="border-y border-line bg-paper-100">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-28">
        <Reveal className="mb-14 flex items-end justify-between gap-6">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              The numbers
            </span>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              The desk in <span className="font-serif italic font-normal">{items.length}</span>{' '}
              figures.
            </h2>
          </div>
        </Reveal>

        <div
          className={`grid grid-cols-1 divide-y divide-line border-y border-line sm:grid-cols-2 sm:divide-y-0 ${
            items.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
          }`}
        >
          {items.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
              className="group relative px-6 py-10 sm:py-14 lg:border-r lg:border-line lg:last:border-r-0"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="mt-6 font-display text-[clamp(3rem,7vw,5rem)] font-black leading-none tracking-tightest text-ink">
                {s.value}
              </div>
              <div className="mt-4 font-display text-base font-bold text-ink">{s.label}</div>
              {s.note && (
                <div className="mt-1 max-w-[200px] text-[13px] text-ink-muted">{s.note}</div>
              )}
              <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary-500 transition-all duration-700 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
