'use client';

import { motion } from 'framer-motion';
import { Reveal } from '@/components/ui/Reveal';
import { RichText } from '../RichText';

type Item = { label: string; value: string; note?: string };

const DEFAULT_EYEBROW = 'The numbers';
const DEFAULT_HEADING = 'The desk in {count} figures.';

function resolveStatsHeading(heading: string, itemCount: number): string {
  return heading.replace(/\{count\}/g, `{italic:${itemCount}}`);
}

function StatsSectionHeader({
  eyebrow,
  heading,
  itemCount,
  className,
}: {
  eyebrow: string;
  heading: string;
  itemCount: number;
  className?: string;
}) {
  const showEyebrow = eyebrow.trim().length > 0;
  const showHeading = heading.trim().length > 0;
  if (!showEyebrow && !showHeading) return null;

  return (
    <Reveal className={className}>
      {showEyebrow ? (
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {eyebrow}
        </span>
      ) : null}
      {showHeading ? (
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          <RichText text={resolveStatsHeading(heading, itemCount)} />
        </h2>
      ) : null}
    </Reveal>
  );
}

export function DynamicStats({
  content,
  variant,
}: {
  content: Record<string, unknown>;
  variant?: string | null;
}) {
  const items = (content.items as Item[]) ?? [];
  const eyebrow = (content.eyebrow as string) ?? DEFAULT_EYEBROW;
  const heading = (content.heading as string) ?? DEFAULT_HEADING;
  const layout = variant ?? 'horizontal';

  // Grid variant: bordered cards in a responsive grid.
  if (layout === 'grid') {
    return (
      <section className="border-y border-line bg-paper-100">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-28">
          <StatsSectionHeader
            eyebrow={eyebrow}
            heading={heading}
            itemCount={items.length}
            className="mb-12"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className="rounded-2xl border border-line bg-paper-50 p-6"
              >
                <div className="font-display text-[clamp(2.2rem,4vw,3.2rem)] font-black leading-none tracking-tightest text-ink">
                  {s.value}
                </div>
                <div className="mt-4 font-display text-base font-bold text-ink">{s.label}</div>
                {s.note && <div className="mt-1 text-[13px] text-ink-muted">{s.note}</div>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Big-number variant: first stat oversized, rest stacked beside it.
  if (layout === 'big-number') {
    const [first, ...rest] = items;
    return (
      <section className="border-y border-line bg-paper-100">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-28">
          <StatsSectionHeader
            eyebrow={eyebrow}
            heading={heading}
            itemCount={items.length}
            className="mb-12 lg:mb-16"
          />
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {first && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="font-display text-[clamp(4rem,12vw,9rem)] font-black leading-none tracking-tightest text-ink">
                  {first.value}
                </div>
                <div className="mt-5 font-display text-xl font-bold text-ink">{first.label}</div>
                {first.note && <div className="mt-2 max-w-sm text-ink-muted">{first.note}</div>}
              </motion.div>
            )}
            <div className="grid grid-cols-1 gap-px self-center overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              {rest.map((s, i) => (
                <div key={i} className="bg-paper-50 p-6">
                  <div className="font-display text-3xl font-black tracking-tightest text-ink">
                    {s.value}
                  </div>
                  <div className="mt-3 font-display text-sm font-bold text-ink">{s.label}</div>
                  {s.note && <div className="mt-1 text-xs text-ink-muted">{s.note}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default: original horizontal divided row.
  return (
    <section className="border-y border-line bg-paper-100">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-28">
        <StatsSectionHeader
          eyebrow={eyebrow}
          heading={heading}
          itemCount={items.length}
          className="mb-14"
        />

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
