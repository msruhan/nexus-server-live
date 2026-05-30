'use client';

import { motion } from 'framer-motion';
import { Counter } from '@/components/ui/Counter';
import { Reveal } from '@/components/ui/Reveal';

const stats = [
  {
    num: '01',
    value: 12400,
    suffix: '+',
    label: 'Active counters',
    note: 'Resellers, technicians, repair shops',
  },
  {
    num: '02',
    value: 98.7,
    suffix: '%',
    decimals: 1,
    label: 'Closed successful',
    note: 'Last 30 days, IMEI + server combined',
  },
  {
    num: '03',
    value: 134,
    suffix: 's',
    label: 'Median delivery',
    note: 'Network unlocks · across all carriers',
  },
  {
    num: '04',
    value: 200,
    suffix: '+',
    label: 'Operators supported',
    note: 'Auto-synced from upstream catalog',
  },
];

export function Stats() {
  return (
    <section id="ledger" className="border-y border-line bg-paper-100">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-28">
        <Reveal className="mb-14 flex items-end justify-between gap-6">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              § 03 · The numbers
            </span>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              The desk in <span className="font-serif italic font-normal">four</span> figures.
            </h2>
          </div>
          <div className="hidden max-w-[280px] text-right font-serif text-[15px] italic leading-snug text-ink/70 lg:block">
            &ldquo;Numbers refresh every minute. Honesty isn&rsquo;t a marketing claim — it&rsquo;s a polling interval.&rdquo;
          </div>
        </Reveal>

        {/* Big horizontal ledger */}
        <div className="grid grid-cols-1 divide-y divide-line border-y border-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="group relative px-6 py-10 sm:py-14 lg:border-r lg:border-line lg:last:border-r-0"
            >
              {/* Number marker */}
              <div className="flex items-start justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                  {s.num}
                </span>
                <span className="h-px w-10 translate-y-2 bg-ink-soft/40" />
              </div>

              {/* The big number */}
              <div className="mt-6 font-display text-[clamp(3rem,7vw,5rem)] font-black leading-none tracking-tightest text-ink">
                <Counter to={s.value} suffix={s.suffix} decimals={s.decimals} />
              </div>

              {/* Label */}
              <div className="mt-4 font-display text-base font-bold text-ink">{s.label}</div>
              <div className="mt-1 max-w-[200px] text-[13px] text-ink-muted">{s.note}</div>

              {/* Hover blue accent */}
              <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary-500 transition-all duration-700 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
