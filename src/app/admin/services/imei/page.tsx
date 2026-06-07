import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServicesTable } from './ServicesTable';

export const dynamic = 'force-dynamic';

export default async function AdminImeiServicesPage() {
  const [services, groups] = await Promise.all([
    prisma.imeiService.findMany({
      orderBy: [{ status: 'asc' }, { price: 'asc' }],
      include: { group: true, api: true },
    }),
    prisma.imeiServiceGroup.findMany({
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
            IMEI <span className="font-serif italic font-normal">register</span>.
          </>
        }
        subtitle={`${services.length} entries · retail price (IDR) shown in the public catalog.`}
      />

      <ServicesTable
        groups={groups}
        rows={services.map((s) => ({
          id: s.id,
          ref: s.toolId ?? '—',
          title: s.title,
          groupId: s.groupId,
          group: s.group.title,
          price: Number(s.price),
          status: s.status,
          provider: s.api.title,
          delivery: s.deliveryTime ?? '—',
          description: s.description ?? '',
          requiresImei: s.requiresImei,
          requiresSn: s.requiresSn,
          requiresEcid: s.requiresEcid,
        }))}
      />
    </div>
  );
}
