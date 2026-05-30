'use client';

import { Reveal } from '@/components/ui/Reveal';

const row1 = [
  'Samsung',
  'Apple',
  'Xiaomi',
  'OPPO',
  'Vivo',
  'Realme',
  'Huawei',
  'Honor',
];
const row2 = [
  'Google · Pixel',
  'OnePlus',
  'Motorola',
  'Sony',
  'Nokia',
  'Asus',
  'Tecno',
  'Infinix',
];

export function Partners() {
  return (
    <section className="relative border-y border-line bg-paper-100 py-14">
      <Reveal>
        <div className="mx-auto mb-8 max-w-[1400px] px-6 lg:px-10">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              Brands &amp; carriers · supported
            </span>
            <span className="font-serif text-sm italic text-ink-muted">
              partial list, alphabetised
            </span>
          </div>
        </div>
      </Reveal>

      <div className="space-y-3 overflow-hidden">
        <MarqueeRow items={row1} />
        <MarqueeRow items={row2} reverse />
      </div>
    </section>
  );
}

function MarqueeRow({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const loop = [...items, ...items, ...items, ...items];
  return (
    <div className="relative overflow-hidden">
      {/* Edge fade */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-paper-100 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-paper-100 to-transparent" />

      <div
        className={`track ${
          reverse ? 'animate-marquee-reverse' : 'animate-marquee'
        }`}
      >
        {loop.map((b, i) => (
          <span
            key={i}
            className="mx-8 inline-flex items-baseline gap-2 font-display text-2xl font-extrabold tracking-tight text-ink/30 transition-colors hover:text-ink lg:text-3xl"
          >
            {b}
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft/50">
              ✱
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
