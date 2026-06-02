'use client';

import * as React from 'react';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import {
  marketplaceInitials,
  resolveMarketplaceImage,
  type MarketplaceCardItem,
} from '@/lib/marketplace';

export function FeaturedCarousel({ items }: { items: MarketplaceCardItem[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: items.length > 1, align: 'start' },
    [Autoplay({ delay: 6000, stopOnInteraction: true, stopOnMouseEnter: true })],
  );
  const [selected, setSelected] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  if (items.length === 0) return null;

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-line shadow-card">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {items.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="min-w-0 shrink-0 grow-0 basis-full">
              <FeaturedSlide item={item} />
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink opacity-0 shadow-card backdrop-blur-sm transition-all hover:bg-paper group-hover:opacity-100"
            aria-label="Previous"
          >
            <ArrowLeft weight="bold" size={16} />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink opacity-0 shadow-card backdrop-blur-sm transition-all hover:bg-paper group-hover:opacity-100"
            aria-label="Next"
          >
            <ArrowRight weight="bold" size={16} />
          </button>
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="h-2 rounded-full bg-paper transition-all"
                style={{ width: selected === i ? 28 : 8, opacity: selected === i ? 1 : 0.5 }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FeaturedSlide({ item }: { item: MarketplaceCardItem }) {
  const img = resolveMarketplaceImage(item.imageUrl);
  return (
    <Link
      href={`/marketplace/${item.kind}/${item.id}`}
      className="relative block aspect-[16/7] overflow-hidden bg-ink sm:aspect-[16/6]"
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink via-ink to-primary-700">
          <span className="font-display text-6xl font-black tracking-tight text-paper/20">
            {marketplaceInitials(item.title)}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/40 to-transparent" />
      <div className="relative flex h-full max-w-2xl flex-col justify-end p-6 sm:p-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/70">
          Featured · {item.kind === 'imei' ? 'IMEI' : 'Server'}
        </span>
        <h3 className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight text-paper sm:text-4xl">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-2 max-w-xl font-serif text-sm italic text-paper/85 sm:text-base line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4">
          <span className="rounded-full bg-paper px-5 py-2 text-xs font-bold text-ink">
            View services
          </span>
          {item.priceFromLabel && (
            <span className="font-mono text-xs text-paper/80">from {item.priceFromLabel}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
