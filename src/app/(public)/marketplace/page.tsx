import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ServiceStatus } from '@/lib/constants';
import { formatUSD, minAmount } from '@/lib/format';
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard';
import { FeaturedCarousel } from '@/components/marketplace/FeaturedCarousel';
import type { MarketplaceCardItem } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: 'all', label: 'All services', href: '/marketplace' },
  { key: 'imei', label: 'IMEI services', href: '/marketplace?type=imei' },
  { key: 'server', label: 'Server services', href: '/marketplace?type=server' },
] as const;

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const activeFilter = type === 'imei' || type === 'server' ? type : 'all';

  const [imeiGroups, serverBoxes] = await Promise.all([
    prisma.imeiServiceGroup.findMany({
      where: { marketplaceVisible: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: { services: { where: { status: ServiceStatus.ACTIVE }, select: { price: true } } },
    }),
    prisma.serverServiceBox.findMany({
      where: { marketplaceVisible: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: { services: { where: { status: ServiceStatus.ACTIVE }, select: { price: true } } },
    }),
  ]);

  const items: MarketplaceCardItem[] = [
    ...imeiGroups.map((g) => ({
      kind: 'imei' as const,
      id: g.id,
      title: g.title,
      description: g.description,
      imageUrl: g.imageUrl,
      featured: g.featured,
      serviceCount: g.services.length,
      priceFromLabel:
        g.services.length > 0 ? formatUSD(minAmount(g.services.map((s) => s.price))) : null,
    })),
    ...serverBoxes.map((b) => ({
      kind: 'server' as const,
      id: b.id,
      title: b.title,
      description: b.description,
      imageUrl: b.imageUrl,
      featured: b.featured,
      serviceCount: b.services.length,
      priceFromLabel:
        b.services.length > 0 ? formatUSD(minAmount(b.services.map((s) => s.price))) : null,
    })),
  ].filter((i) => i.serviceCount > 0);

  const filteredItems = items.filter((item) =>
    activeFilter === 'all' ? true : item.kind === activeFilter,
  );
  const featured = filteredItems.filter((i) => i.featured);

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-24">
      <div className="border-b border-line pb-10">
        <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          § Marketplace
        </span>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink lg:text-6xl">
          Browse <span className="font-serif font-normal italic">services</span>.
        </h1>
        <p className="mt-5 max-w-2xl font-serif text-lg italic leading-relaxed text-ink-muted">
          Pick a category to see every service inside it — pricing, delivery time, and the device
          details we need to run your order.
        </p>
        <div className="mt-7 inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-paper-50 p-1">
          {FILTERS.map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <Link
                key={filter.key}
                href={filter.href}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  active ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </div>

      {featured.length > 0 && (
        <div className="mt-10">
          <FeaturedCarousel items={featured} />
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="mt-12 rounded-2xl border-2 border-dashed border-line bg-paper-50 px-6 py-20 text-center">
          <p className="font-serif text-lg italic text-ink-muted">
            No services available for this filter yet.
          </p>
        </div>
      ) : (
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <MarketplaceCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
