import { prisma } from '@/lib/db';

export type AnnouncementTone = 'info' | 'warning' | 'maintenance';

export type ActiveAnnouncement = {
  id: string;
  title: string | null;
  message: string;
  tone: AnnouncementTone;
  linkUrl: string | null;
  linkLabel: string | null;
};

export async function getActiveAnnouncements(includeAdmin: boolean): Promise<ActiveAnnouncement[]> {
  const now = new Date();
  const rows = await prisma.siteAnnouncement.findMany({
    where: {
      isActive: true,
      ...(includeAdmin ? {} : { showOnAdmin: false }),
      OR: [
        { startAt: null, endAt: null },
        { startAt: { lte: now }, endAt: null },
        { startAt: null, endAt: { gte: now } },
        { startAt: { lte: now }, endAt: { gte: now } },
      ],
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      message: true,
      tone: true,
      linkUrl: true,
      linkLabel: true,
    },
  });

  return rows.map((r) => ({
    ...r,
    tone: (r.tone as AnnouncementTone) || 'info',
  }));
}
