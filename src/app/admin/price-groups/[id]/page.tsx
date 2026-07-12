import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatPriceGroupRule, serializePriceGroup } from '@/lib/price-group';
import { formatPriceRuleSummary, ruleValuesFromRow } from '@/lib/price-group-rule';
import { GroupPricingManager } from './GroupPricingManager';

export const dynamic = 'force-dynamic';

export default async function AdminPriceGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const group = await prisma.priceGroup.findUnique({
    where: { id },
    include: { _count: { select: { users: true, rules: true } } },
  });
  if (!group) notFound();

  const serialized = serializePriceGroup(group);
  const [
    imeiGroups,
    serverBoxes,
    imeiServices,
    serverServices,
    rules,
  ] = await Promise.all([
    prisma.imeiServiceGroup.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, title: true, _count: { select: { services: true } } },
    }),
    prisma.serverServiceBox.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, title: true, _count: { select: { services: true } } },
    }),
    prisma.imeiService.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        toolId: true,
        price: true,
        groupId: true,
        group: { select: { title: true } },
      },
    }),
    prisma.serverService.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        toolId: true,
        price: true,
        boxId: true,
        box: { select: { title: true } },
      },
    }),
    prisma.priceGroupRule.findMany({ where: { priceGroupId: id }, orderBy: { createdAt: 'desc' } }),
  ]);

  const catalogRules = rules
    .filter((r) => r.scope === 'CATALOG_GROUP')
    .map((r) => {
      const ig = imeiGroups.find((g) => g.id === r.imeiGroupId);
      const sb = serverBoxes.find((b) => b.id === r.serverBoxId);
      return {
        id: r.id,
        kind: r.kind as 'imei' | 'server',
        catalogGroupId: r.imeiGroupId ?? r.serverBoxId!,
        catalogGroupTitle: ig?.title ?? sb?.title ?? '—',
        serviceCount: ig?._count.services ?? sb?._count.services ?? 0,
        ruleType: r.ruleType as 'PERCENT' | 'FIXED' | 'ABSOLUTE',
        summary: formatPriceRuleSummary(ruleValuesFromRow(r)),
      };
    });

  const serviceRules = rules
    .filter((r) => r.scope === 'SERVICE')
    .map((r) => {
      const imei = r.imeiServiceId
        ? imeiServices.find((s) => s.id === r.imeiServiceId)
        : null;
      const server = r.serverServiceId
        ? serverServices.find((s) => s.id === r.serverServiceId)
        : null;
      return {
        id: r.id,
        kind: r.kind as 'imei' | 'server',
        serviceId: r.imeiServiceId ?? r.serverServiceId!,
        serviceTitle: imei?.title ?? server?.title ?? '—',
        serviceRef: imei?.toolId ?? server?.toolId ?? null,
        catalogGroupTitle: imei?.group.title ?? server?.box.title ?? null,
        retailPrice: Number(imei?.price ?? server?.price ?? 0),
        ruleType: r.ruleType as 'PERCENT' | 'FIXED' | 'ABSOLUTE',
        summary: formatPriceRuleSummary(ruleValuesFromRow(r)),
      };
    });

  const catalogCount = catalogRules.length;
  const serviceCount = serviceRules.length;

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/price-groups"
        className="mb-4 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
      >
        ← User groups
      </Link>
      <PageHeader
        section="§ Admin · User groups"
        title={
          <>
            {group.name} <span className="font-serif italic font-normal">pricing</span>.
          </>
        }
        subtitle={`${formatPriceGroupRule(serialized)} · ${group._count.users} users · ${catalogCount} catalog rules · ${serviceCount} service rules`}
      />
      <GroupPricingManager
        groupId={group.id}
        groupName={group.name}
        defaultRule={formatPriceGroupRule(serialized)}
        defaultEnabled={serialized.defaultEnabled}
        imeiGroups={imeiGroups.map((g) => ({
          id: g.id,
          title: g.title,
          serviceCount: g._count.services,
        }))}
        serverBoxes={serverBoxes.map((b) => ({
          id: b.id,
          title: b.title,
          serviceCount: b._count.services,
        }))}
        imeiServices={imeiServices.map((s) => ({
          id: s.id,
          title: s.title,
          ref: s.toolId,
          retailPrice: Number(s.price),
          catalogGroupId: s.groupId,
          catalogGroupTitle: s.group.title,
        }))}
        serverServices={serverServices.map((s) => ({
          id: s.id,
          title: s.title,
          ref: s.toolId,
          retailPrice: Number(s.price),
          catalogGroupId: s.boxId,
          catalogGroupTitle: s.box.title,
        }))}
        initialCatalogRules={catalogRules}
        initialServiceRules={serviceRules}
      />
    </div>
  );
}
