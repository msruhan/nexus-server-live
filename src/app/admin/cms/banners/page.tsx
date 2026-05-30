import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { BannerManager } from './BannerManager';

export const dynamic = 'force-dynamic';

export default async function BannersPage() {
  const banners = await prisma.banner.findMany({
    orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }],
  });

  return (
    <div>
      <PageHeader
        section="§ Admin · CMS"
        title={
          <>
            Banners &amp; <span className="font-serif italic font-normal">slider</span>.
          </>
        }
        subtitle="Upload promo images, schedule visibility, track clicks."
      />
      <BannerManager
        initial={banners.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          imageUrl: b.imageUrl,
          linkUrl: b.linkUrl,
          position: b.position,
          isActive: b.isActive,
          startDate: b.startDate ? b.startDate.toISOString() : null,
          endDate: b.endDate ? b.endDate.toISOString() : null,
          clickCount: b.clickCount,
          viewCount: b.viewCount,
        }))}
      />
    </div>
  );
}
