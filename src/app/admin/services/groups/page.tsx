import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { GroupServicesManager } from './GroupServicesManager';

export const dynamic = 'force-dynamic';

export default async function AdminGroupServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === 'server' ? 'server' : 'imei';

  const [imeiGroups, serverBoxes] = await Promise.all([
    prisma.imeiServiceGroup.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { services: true } } },
    }),
    prisma.serverServiceBox.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { services: true } } },
    }),
  ]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        section="§ Admin · Catalog"
        title={
          <>
            Group <span className="font-serif italic font-normal">services</span>.
          </>
        }
        subtitle="Organize IMEI and server services into catalog groups shown on the public site."
      />

      <GroupServicesManager
        activeTab={activeTab}
        imeiGroups={imeiGroups.map((g) => ({
          id: g.id,
          title: g.title,
          description: g.description,
          sortOrder: g.sortOrder,
          servicesCount: g._count.services,
        }))}
        serverBoxes={serverBoxes.map((b) => ({
          id: b.id,
          title: b.title,
          sortOrder: b.sortOrder,
          servicesCount: b._count.services,
        }))}
      />
    </div>
  );
}
