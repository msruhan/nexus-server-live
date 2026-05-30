import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { DownloadToolsManager } from './DownloadToolsManager';

export const dynamic = 'force-dynamic';

export default async function AdminDownloadToolsPage() {
  const tools = await prisma.downloadTool.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });

  return (
    <div className="max-w-4xl">
      <PageHeader
        section="§ Admin · Library"
        title={
          <>
            Download <span className="font-serif italic font-normal">tools</span>.
          </>
        }
        subtitle={`${tools.length} entries · publish tools for members to download from their dashboard.`}
      />
      <DownloadToolsManager
        initial={tools.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          version: t.version,
          platform: t.platform,
          downloadUrl: t.downloadUrl,
          isPublished: t.isPublished,
          sortOrder: t.sortOrder,
        }))}
      />
    </div>
  );
}
