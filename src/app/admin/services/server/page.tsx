import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServerServicesTable } from './ServerServicesTable';

export const dynamic = 'force-dynamic';

export default async function AdminServerServicesPage() {
  const [services, groups] = await Promise.all([
    prisma.serverService.findMany({
      orderBy: [{ status: 'asc' }, { price: 'asc' }],
      include: { box: true, api: true },
    }),
    prisma.serverServiceBox.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        section="§ Admin · Catalog"
        title={
          <>
            Server <span className="font-serif italic font-normal">register</span>.
          </>
        }
        subtitle={`${services.length} entries · click prices to edit, click status to toggle.`}
      />

      <ServerServicesTable
        groups={groups}
        rows={services.map((s) => ({
          id: s.id,
          ref: s.toolId ?? '—',
          title: s.title,
          groupId: s.boxId,
          group: s.box.title,
          price: Number(s.price),
          status: s.status,
          delivery: s.deliveryTime ?? '—',
          description: s.description ?? '',
          requiredFields: s.requiredFields ?? '',
        }))}
      />
    </div>
  );
}
