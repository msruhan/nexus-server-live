import { prisma } from '@/lib/db';

const FALLBACK = [
  { tag: 'LIVE', text: 'iCloud Clean Removal · 6m 24s avg' },
  { tag: 'NEW', text: 'Samsung S24 USA carrier unlock added' },
  { tag: 'NOTE', text: 'Polling cadence locked at 60 seconds' },
  { tag: 'REFUND', text: 'Auto-credit on REJECTED status' },
  { tag: 'UPSTREAM', text: 'DhruFusion API · 99.9% uptime / 30d' },
];

export async function Ticker() {
  const ads = await prisma.runningAd.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    take: 12,
  });

  const items =
    ads.length > 0
      ? ads.map((a) => ({ tag: a.icon ?? 'NOTE', text: a.text, href: a.linkUrl }))
      : FALLBACK.map((it) => ({ ...it, href: undefined as string | undefined }));

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
                <a href={it.href} className="text-paper/80 underline-offset-4 hover:text-paper hover:underline">
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
