'use client';

import { motion } from 'framer-motion';
import { Reveal } from '@/components/ui/Reveal';
import { RichText } from '../RichText';

type Item = { num?: string; title: string; description: string };

export function DynamicFeatures({ content }: { content: Record<string, unknown> }) {
  const heading = (content.heading as string) ?? 'What we do.';
  const items = (content.items as Item[]) ?? [];
  const cols = Math.min(Math.max(Number(content.columns ?? 3), 1), 4);
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
