import { prisma } from '@/lib/db';
import type { RunningAdsTickerItem } from '@/lib/cms-types';

type Props = {
  fallbackItems?: RunningAdsTickerItem[];
};

export async function Ticker({ fallbackItems = [] }: Props) {
  const ads = await prisma.runningAd.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    take: 12,
  });

  const items =
    ads.length > 0
      ? ads.map((a) => ({ tag: a.icon ?? 'NOTE', text: a.text, href: a.linkUrl ?? undefined }))
      : fallbackItems.map((it) => ({ tag: it.tag, text: it.text, href: it.href }));

  if (items.length === 0) return null;

  const loop = [...items, ...items, ...items];

  return (
    <div className="relative z-30 border-b border-ink/10 bg-ink text-paper">
      <div className="overflow-hidden">
        <div className="track animate-marquee py-2.5">
          {loop.map((it, i) => (
            <span
              key={i}
              className="mx-6 inline-flex items-center gap-3 whitespace-nowrap font-mono text-[11px] tracking-wide"
            >
              <span className="rounded-sm bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white">
                {it.tag}
              </span>
              {it.href ? (
                <a
                  href={it.href}
                  className="text-paper/80 underline-offset-4 hover:text-paper hover:underline"
                >
                  {it.text}
                </a>
              ) : (
                <span className="text-paper/80">{it.text}</span>
              )}
              <span className="text-ink-soft/40">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
