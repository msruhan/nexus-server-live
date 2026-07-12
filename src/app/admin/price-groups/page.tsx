import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatPriceGroupRule, serializePriceGroup } from '@/lib/price-group';
import { PriceGroupsManager } from './PriceGroupsManager';

export const dynamic = 'force-dynamic';

function summarizeGroup(g: {
  defaultEnabled: boolean;
  adjustmentType: string;
  discountPercent: number;
  fixedAdjustment: number;
  rules: { scope: string }[];
}) {
  const catalog = g.rules.filter((r) => r.scope === 'CATALOG_GROUP').length;
  const service = g.rules.filter((r) => r.scope === 'SERVICE').length;
  const parts: string[] = [];
  if (g.defaultEnabled) {
    parts.push(formatPriceGroupRule(g));
  } else {
    parts.push('No default');
  }
  if (catalog) parts.push(`${catalog} catalog`);
  if (service) parts.push(`${service} service`);
  return parts.join(' · ');
}

export default async function AdminPriceGroupsPage() {
  const groups = await prisma.priceGroup.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      rules: { select: { scope: true } },
      _count: { select: { users: true, rules: true } },
    },
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
        subtitle="Special pricing by user group: global default, catalog group rules, or per-service rules (% / ± / fixed)."
      />
      <PriceGroupsManager
        initial={groups.map((g) => {
          const row = serializePriceGroup(g);
          return {
            id: g.id,
            name: g.name,
            description: g.description,
            defaultEnabled: row.defaultEnabled,
            adjustmentType: row.adjustmentType as 'PERCENT' | 'FIXED',
            discountPercent: row.discountPercent,
            fixedAdjustment: row.fixedAdjustment,
            isActive: g.isActive,
            users: g._count.users,
            rules: g._count.rules,
            summary: summarizeGroup({
              defaultEnabled: row.defaultEnabled,
              adjustmentType: row.adjustmentType,
              discountPercent: row.discountPercent,
              fixedAdjustment: row.fixedAdjustment,
              rules: g.rules,
            }),
          };
        })}
      />
    </div>
  );
}
