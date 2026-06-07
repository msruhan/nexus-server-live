'use client';

import { Reveal } from '@/components/ui/Reveal';
import type { PartnersContent } from '@/lib/cms-types';

type Props = {
  content: PartnersContent;
};

export function Partners({ content }: Props) {
  const row1 = content.row1 ?? [];
  const row2 = content.row2 ?? [];

  if (row1.length === 0 && row2.length === 0) {
    return (
      <section className="relative border-y border-line bg-paper-100 py-14">
        <div className="mx-auto max-w-[1400px] px-6 text-center font-serif text-sm italic text-ink-muted lg:px-10">
          No partner names yet. Add rows in Landing builder → Partners marquee.
        </div>
      </section>
    );
  }

  return (
    <section className="relative border-y border-line bg-paper-100 py-14">
      <Reveal>
        <div className="mx-auto mb-8 max-w-[1400px] px-6 lg:px-10">
          <div className="flex items-baseline justify-between">
            {content.eyebrow && (
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                {content.eyebrow}
              </span>
            )}
            {content.subtitle && (
              <span className="font-serif text-sm italic text-ink-muted">{content.subtitle}</span>
            )}
          </div>
        </div>
      </Reveal>

      <div className="space-y-3 overflow-hidden">
        {row1.length > 0 && <MarqueeRow items={row1} />}
        {row2.length > 0 && <MarqueeRow items={row2} reverse />}
      </div>
    </section>
  );
}

function MarqueeRow({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const loop = [...items, ...items, ...items, ...items];
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-paper-100 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-paper-100 to-transparent" />

      <div className={`track ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}>
        {loop.map((b, i) => (
          <span
            key={i}
            className="mx-8 inline-flex items-baseline gap-2 font-display text-2xl font-extrabold tracking-tight text-ink/30 transition-colors hover:text-ink lg:text-3xl"
          >
            {b}
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft/50">✱</span>
          </span>
        ))}
      </div>
    </div>
  );
}
