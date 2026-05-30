import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { RunningAdManager } from './RunningAdManager';

export const dynamic = 'force-dynamic';

export default async function RunningAdsPage() {
  const ads = await prisma.runningAd.findMany({ orderBy: { sortOrder: 'asc' } });
  return (
    <div>
      <PageHeader
        section="§ Admin · CMS"
        title={
          <>
            Running <span className="font-serif italic font-normal">ads</span>.
          </>
        }
        subtitle="Inline ticker text running across the top of the site."
      />
      <RunningAdManager
        initial={ads.map((a) => ({
          id: a.id,
          text: a.text,
          linkUrl: a.linkUrl,
          bgColor: a.bgColor,
          textColor: a.textColor,
          icon: a.icon,
          isActive: a.isActive,
        }))}
      />
    </div>
  );
}
