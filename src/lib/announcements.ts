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

const scheduleWhere = (now: Date) => ({
  OR: [
    { startAt: null, endAt: null },
    { startAt: { lte: now }, endAt: null },
    { startAt: null, endAt: { gte: now } },
    { startAt: { lte: now }, endAt: { gte: now } },
  ],
});

/** Active banners for the public site and member dashboard (always shown when active). */
export async function getSiteAnnouncements(): Promise<ActiveAnnouncement[]> {
  const now = new Date();
  const rows = await prisma.siteAnnouncement.findMany({
    where: {
      isActive: true,
      ...scheduleWhere(now),
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

/** Optional extra banners inside the admin panel (`showOnAdmin` flag). */
export async function getAdminAnnouncements(): Promise<ActiveAnnouncement[]> {
  const now = new Date();
  const rows = await prisma.siteAnnouncement.findMany({
    where: {
      isActive: true,
      showOnAdmin: true,
      ...scheduleWhere(now),
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

/** @deprecated Use getSiteAnnouncements or getAdminAnnouncements. */
export async function getActiveAnnouncements(includeAdmin: boolean): Promise<ActiveAnnouncement[]> {
  return includeAdmin ? getAdminAnnouncements() : getSiteAnnouncements();
}
