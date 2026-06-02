'use client';

import { motion } from 'framer-motion';
import { Reveal } from '@/components/ui/Reveal';
import { RichText } from '../RichText';

type Item = { num?: string; title: string; description: string };

export function DynamicFeatures({
  content,
  variant,
}: {
  content: Record<string, unknown>;
  variant?: string | null;
}) {
  const heading = (content.heading as string) ?? 'What we do.';
  const items = (content.items as Item[]) ?? [];
  const layout = variant ?? 'bento';

  // Numbered-list variant: editorial vertical list with big index numbers.
  if (layout === 'numbered-list') {
    return (
      <section className="border-y border-line bg-paper-100">
        <div className="mx-auto max-w-3xl px-6 py-20 lg:py-28">
          <Reveal className="mb-12">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              <RichText text={heading} />
            </h2>
          </Reveal>
          <div className="divide-y divide-line border-y border-line">
            {items.map((it, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="flex items-baseline gap-6 py-6"
              >
                <span className="font-mono text-sm tabular-nums text-ink-soft">
                  {it.num ?? String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">
                    {it.title}
                  </h3>
                  <p className="mt-2 font-serif text-base italic leading-relaxed text-ink/75">
                    {it.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Icon-left variant: two-column rows with a marker bullet on the left.
  if (layout === 'icon-left') {
    return (
      <section className="border-y border-line bg-paper-100">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-28">
          <Reveal className="mb-12">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              <RichText text={heading} />
            </h2>
          </Reveal>
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {items.map((it, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="flex gap-4"
              >
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink font-mono text-xs font-bold text-paper">
                  {it.num ?? String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">
                    {it.title}
                  </h3>
                  <p className="mt-1.5 font-serif text-[15px] italic leading-relaxed text-ink/75">
                    {it.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Grid variants (bento default / three-col / four-col) share card markup;
  // only the column count differs.
  const cols =
    layout === 'four-col'
      ? 4
      : layout === 'three-col'
        ? 3
        : Math.min(Math.max(Number(content.columns ?? 3), 1), 4);
  const colsClass =
    cols === 1
      ? 'grid-cols-1'
      : cols === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : cols === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <section className="border-y border-line bg-paper-100">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-28">
        <Reveal className="mb-12">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
            <RichText text={heading} />
          </h2>
        </Reveal>

        <div className={`grid gap-3 ${colsClass}`}>
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.6, delay: i * 0.06 }}
              className="group rounded-2xl border border-line bg-paper-50 p-6 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">
                  {it.title}
                </h3>
                {it.num && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                    {it.num}
                  </span>
                )}
              </div>
              <p className="mt-3 font-serif text-base italic leading-relaxed text-ink/75">
                {it.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
