'use client';

import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Reveal } from '@/components/ui/Reveal';

type Item = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
};

function resolveBannerImageUrl(url: string) {
  return url.startsWith('/uploads/') ? `/api${url}` : url;
}

export function BannerSlider({ items }: { items: Item[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start', skipSnaps: false },
    [Autoplay({ delay: 5500, stopOnInteraction: true, stopOnMouseEnter: true })],
  );
  const [selected, setSelected] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const next = emblaApi.selectedScrollSnap();
      setSelected(next);
    };
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, selected]);

  function onClick(item: Item) {
    if (item.linkUrl) {
      fetch(`/api/cms/banners/${item.id}/click`, { method: 'POST' }).catch(() => null);
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-[1400px] px-6 py-10 lg:px-10 lg:py-14">
      <Reveal>
        <div className="group relative overflow-hidden rounded-3xl border border-line bg-paper">
          {/* Embla viewport */}
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex">
              {items.map((b, idx) => (
                <div key={b.id} className="min-w-0 shrink-0 grow-0 basis-full">
                  <BannerSlide
                    item={b}
                    onClick={() => onClick(b)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Navigation arrows — appear on hover */}
          {items.length > 1 && (
            <>
              <button
                onClick={() => emblaApi?.scrollPrev()}
                className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink opacity-0 shadow-card backdrop-blur-sm transition-all hover:bg-paper group-hover:opacity-100"
                aria-label="Previous banner"
              >
                <ArrowLeft weight="bold" size={16} />
              </button>
              <button
                onClick={() => emblaApi?.scrollNext()}
                className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink opacity-0 shadow-card backdrop-blur-sm transition-all hover:bg-paper group-hover:opacity-100"
                aria-label="Next banner"
              >
                <ArrowRight weight="bold" size={16} />
              </button>
            </>
          )}

          {/* Progress dots */}
          {items.length > 1 && (
            <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  aria-label={`Go to banner ${i + 1}`}
                  className="relative h-2 overflow-hidden rounded-full transition-all"
                  style={{
                    width: selected === i ? 32 : 8,
                    background: selected === i ? 'rgb(var(--paper))' : 'rgb(var(--paper) / 0.5)',
                  }}
                >
                  {selected === i && (
                    <motion.span
                      className="absolute inset-0 origin-left rounded-full bg-paper"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 5.5, ease: 'linear' }}
                      key={`progress-${i}-${selected}`}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Slide counter */}
          <div className="absolute right-5 top-5 z-20 rounded-full bg-ink/60 px-3 py-1 font-mono text-[10px] font-bold tabular-nums text-paper backdrop-blur-sm">
            {String(selected + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function BannerSlide({
  item,
  onClick,
}: {
  item: Item;
  onClick: () => void;
}) {
  const content = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveBannerImageUrl(item.imageUrl)}
      alt={item.title}
      className="h-full w-full object-contain"
    />
  );

  if (item.linkUrl) {
    return (
      <a
        href={item.linkUrl}
        onClick={onClick}
        target={item.linkUrl.startsWith('http') ? '_blank' : undefined}
        rel={item.linkUrl.startsWith('http') ? 'noreferrer' : undefined}
        className="relative block aspect-[16/6] overflow-hidden bg-paper sm:aspect-[16/5]"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="relative block aspect-[16/6] overflow-hidden bg-paper sm:aspect-[16/5]">
      {content}
    </div>
  );
}
