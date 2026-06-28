import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { AnnouncementManager } from './AnnouncementManager';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const items = await prisma.siteAnnouncement.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        section="§ Admin · CMS"
        title={
          <>
            Site <span className="font-serif italic font-normal">announcements</span>.
          </>
        }
        subtitle="Global banner at the top of the landing page and member dashboard. Optionally show the same banner inside the admin panel. Separate from running ads ticker."
      />
      <AnnouncementManager
        initial={items.map((i) => ({
          ...i,
          tone: (i.tone as 'info' | 'warning' | 'maintenance') || 'info',
          startAt: i.startAt?.toISOString() ?? null,
          endAt: i.endAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
