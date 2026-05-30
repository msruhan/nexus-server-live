import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { serializePriceGroup } from '@/lib/price-group';
import { PriceGroupsManager } from './PriceGroupsManager';

export const dynamic = 'force-dynamic';

export default async function AdminPriceGroupsPage() {
  const groups = await prisma.priceGroup.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { users: true, overrides: true } } },
  });
  return (
    <div className="max-w-5xl">
      <PageHeader
        section="§ Admin · Users"
        title={
          <>
            User <span className="font-serif italic font-normal">groups</span>.
          </>
        }
        subtitle="Group members (e.g. Reseller) for special pricing: % off, ± USD per service, or custom price per service."
      />
      <PriceGroupsManager
        initial={groups.map((g) => {
          const row = serializePriceGroup(g);
          return {
            id: g.id,
            name: g.name,
            description: g.description,
            adjustmentType: row.adjustmentType as 'PERCENT' | 'FIXED',
            discountPercent: row.discountPercent,
            fixedAdjustment: row.fixedAdjustment,
            isActive: g.isActive,
            users: g._count.users,
            overrides: g._count.overrides,
          };
        })}
      />
    </div>
  );
}
