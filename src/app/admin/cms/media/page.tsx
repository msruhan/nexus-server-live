import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { MediaLibrary } from './MediaLibrary';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const items = await prisma.mediaFile.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const folders = Array.from(new Set(items.map((i) => i.folder)));

  return (
    <div>
      <PageHeader
        section="§ Admin · CMS"
        title={
          <>
            Media <span className="font-serif italic font-normal">library</span>.
          </>
        }
        subtitle="Upload, browse, copy URLs, delete. Files saved under /public/uploads."
      />
      <MediaLibrary
        initial={items.map((i) => ({
          id: i.id,
          url: i.url,
          filename: i.filename,
          mimeType: i.mimeType,
          size: i.size,
          folder: i.folder,
          altText: i.altText,
          createdAt: i.createdAt.toISOString(),
        }))}
        folders={folders}
      />
    </div>
  );
}
