import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatPriceGroupRule, serializePriceGroup } from '@/lib/price-group';
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
    include: { _count: { select: { users: true, overrides: true } } },
  });
  if (!group) notFound();

  const serialized = serializePriceGroup(group);
  const [imeiServices, serverServices, overrides] = await Promise.all([
    prisma.imeiService.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { title: 'asc' },
      select: { id: true, title: true, toolId: true, price: true },
    }),
    prisma.serverService.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { title: 'asc' },
      select: { id: true, title: true, toolId: true, price: true },
    }),
    prisma.servicePriceOverride.findMany({ where: { priceGroupId: id } }),
  ]);

  const imeiIds = overrides.map((o) => o.imeiServiceId).filter(Boolean) as string[];
  const serverIds = overrides.map((o) => o.serverServiceId).filter(Boolean) as string[];
  const imeiMap = new Map(imeiServices.map((s) => [s.id, s]));
  const serverMap = new Map(serverServices.map((s) => [s.id, s]));

  const initialOverrides = overrides.map((o) => {
    const imei = o.imeiServiceId ? imeiMap.get(o.imeiServiceId) : null;
    const server = o.serverServiceId ? serverMap.get(o.serverServiceId) : null;
    return {
      id: o.id,
      kind: o.imeiServiceId ? ('imei' as const) : ('server' as const),
      serviceId: o.imeiServiceId ?? o.serverServiceId!,
      serviceTitle: imei?.title ?? server?.title ?? '—',
      serviceRef: imei?.toolId ?? server?.toolId ?? null,
      retailPrice: Number(imei?.price ?? server?.price ?? 0),
      price: Number(o.price),
    };
  });

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
        subtitle={`${formatPriceGroupRule(serialized)} · ${group._count.users} users · ${group._count.overrides} custom service prices`}
      />
      <GroupPricingManager
        groupId={group.id}
        groupName={group.name}
        defaultRule={formatPriceGroupRule(serialized)}
        imeiServices={imeiServices.map((s) => ({
          id: s.id,
          title: s.title,
          ref: s.toolId,
          retailPrice: Number(s.price),
        }))}
        serverServices={serverServices.map((s) => ({
          id: s.id,
          title: s.title,
          ref: s.toolId,
          retailPrice: Number(s.price),
        }))}
        initialOverrides={initialOverrides}
      />
    </div>
  );
}
