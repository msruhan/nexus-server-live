import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import {
  marketplaceInitials,
  resolveMarketplaceImage,
  type MarketplaceCardItem,
} from '@/lib/marketplace';

export function MarketplaceCard({ item }: { item: MarketplaceCardItem }) {
  const img = resolveMarketplaceImage(item.imageUrl);

  return (
    <Link
      href={`/marketplace/${item.kind}/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-paper-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink via-ink to-primary-700">
            <span className="font-display text-4xl font-black tracking-tight text-paper/90">
              {marketplaceInitials(item.title)}
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-md bg-ink/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-paper backdrop-blur-sm">
          {item.kind === 'imei' ? 'IMEI' : 'Server'}
        </span>
        {item.featured && (
          <span className="absolute right-3 top-3 rounded-md bg-amber-400 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 font-serif text-sm italic text-ink-muted">
            {item.description}
          </p>
        )}
        <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
              {item.serviceCount} service{item.serviceCount === 1 ? '' : 's'}
            </div>
            {item.priceFromLabel && (
              <div className="mt-0.5 font-display text-lg font-black tracking-tight text-ink">
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-ink-soft">
                  from{' '}
                </span>
                {item.priceFromLabel}
              </div>
            )}
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft transition-all group-hover:border-ink group-hover:text-ink">
            <ArrowUpRight weight="bold" size={14} className="transition-transform group-hover:rotate-45" />
          </span>
        </div>
      </div>
    </Link>
  );
}
