import Link from 'next/link';
import type { ActiveAnnouncement } from '@/lib/announcements';

const toneStyles: Record<ActiveAnnouncement['tone'], string> = {
  info: 'border-primary-200 bg-primary-50 text-primary-950',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
  maintenance: 'border-ink/20 bg-ink text-paper',
};

export function GlobalAnnouncementBar({ items }: { items: ActiveAnnouncement[] }) {
  if (items.length === 0) return null;

  return (
    <div className="relative z-50 space-y-0" role="region" aria-label="Site announcements">
      {items.map((item) => (
        <div
          key={item.id}
          className={`border-b px-4 py-3 text-center text-sm font-medium ${toneStyles[item.tone] ?? toneStyles.info}`}
        >
          {item.title && (
            <span className="mr-2 font-display font-bold tracking-tight">{item.title}</span>
          )}
          <span className={item.tone === 'maintenance' ? 'text-paper/90' : 'text-inherit'}>{item.message}</span>
          {item.linkUrl && (
            <Link
              href={item.linkUrl}
              className={`ml-2 inline-flex font-semibold underline underline-offset-2 ${
                item.tone === 'maintenance' ? 'text-paper' : 'text-inherit'
              }`}
            >
              {item.linkLabel ?? 'Learn more'}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
