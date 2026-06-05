import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { DownloadToolsLibrary } from './DownloadToolsLibrary';

export const dynamic = 'force-dynamic';

export default async function UserDownloadToolsPage() {
  const tools = await prisma.downloadTool.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });

  return (
    <div>
      <PageHeader
        section="§ Library"
        title={
          <>
            Download <span className="font-serif italic font-normal">tools</span>.
          </>
        }
        subtitle={`${tools.length} published tools · find drivers, utilities, and software published on the platform.`}
      />
      <DownloadToolsLibrary
        tools={tools.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          version: t.version,
          platform: t.platform,
          downloadUrl: t.downloadUrl,
        }))}
      />
    </div>
  );
}
