import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getBranding } from '@/lib/branding';
import { Catalog } from './Catalog';
import { HowToOrder } from './HowToOrder';
import { Voices } from './Voices';
import { Notes } from './Notes';
import { Partners } from './Partners';
import { DynamicHero } from './sections/DynamicHero';
import { DynamicStats } from './sections/DynamicStats';
import { DynamicCta } from './sections/DynamicCta';
import { DynamicFeatures } from './sections/DynamicFeatures';
import { CustomHtmlSection } from './sections/CustomHtmlSection';
import { Spacer } from './sections/Spacer';
import { BannerSlider } from './sections/BannerSlider';
import { Ticker } from './Ticker';
import { SectionFrame } from './SectionFrame';
import { resolveSettings } from '@/lib/cms-style';
import { resolveSectionContent } from '@/lib/cms-content';
import type {
  ServiceCatalogContent,
  PartnersContent,
  RunningAdsContent,
  HowToOrderContent,
  RunningAdsTickerItem,
} from '@/lib/cms-types';
import { renderMarkdown } from '@/lib/markdown';

type StoredSection = {
  id: string;
  sectionType: string;
  title: string | null;
  subtitle: string | null;
  content: string;
  settings: string;
  isVisible?: boolean;
};

function parseJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export async function SectionRenderer({ sections }: { sections: StoredSection[] }) {
  const host = (await headers()).get('host') ?? 'localhost';
  const [faq, testimonials, banners, brand] = await Promise.all([
    prisma.faqItem.findMany({
      where: { isVisible: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.testimonial.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    getBranding(),
  ]);

  return (
    <>
      {sections.map((s) => {
        const raw = parseJson<Record<string, unknown>>(s.content, {});
        const content = resolveSectionContent(s.sectionType, raw);
        const { style, variant } = resolveSettings(s.settings, s.sectionType);
        const key = `${s.sectionType}-${s.id}`;
        const inner = renderSection(s.sectionType, key, content, variant, {
          faq,
          testimonials,
          banners,
          siteName: brand.siteName,
          host,
        });
        if (!inner) return null;

        const node = (
          <SectionFrame key={key} style={style} sectionType={s.sectionType}>
            {inner}
          </SectionFrame>
        );

        if (s.isVisible === false) {
          return (
            <div key={key} className="relative" data-hidden-section>
              <div className="pointer-events-none absolute right-4 top-4 z-30 rounded-full bg-amber-400 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ink shadow-card">
                Hidden
              </div>
              <div className="opacity-40 grayscale">{node}</div>
            </div>
          );
        }
        return node;
      })}
    </>
  );
}

type Shared = {
  faq: Array<{ id: string; category: string; question: string; answer: string }>;
  testimonials: Array<{ id: string; name: string; role: string | null; rating: number; content: string }>;
  banners: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    imageUrl: string;
    linkUrl: string | null;
    position: string;
  }>;
  siteName: string;
  host: string;
};

function renderSection(
  sectionType: string,
  key: string,
  content: Record<string, unknown>,
  variant: string | null,
  shared: Shared,
): React.ReactNode {
  const { faq, testimonials, banners, siteName, host } = shared;
  switch (sectionType) {
    case 'hero':
      return <DynamicHero key={key} content={content} variant={variant} siteName={siteName} host={host} />;
    case 'stats':
      return <DynamicStats key={key} content={content} variant={variant} />;
    case 'features':
      return <DynamicFeatures key={key} content={content} variant={variant} />;
    case 'service_catalog':
      return <Catalog key={key} content={content as ServiceCatalogContent} />;
    case 'testimonials': {
      const items = testimonials.map((t) => ({
        id: t.id,
        name: t.name,
        role: t.role ?? '',
        rating: t.rating,
        content: t.content,
      }));
      return (
        <Voices
          key={key}
          items={items}
          heading={(content.heading as string) ?? undefined}
          emptyMessage={(content.emptyMessage as string) ?? undefined}
        />
      );
    }
    case 'faq': {
      const cat = (content.category as string) ?? null;
      const items = (cat ? faq.filter((f) => f.category === cat) : faq).map((f) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
      }));
      return (
        <Notes
          key={key}
          items={items}
          heading={(content.heading as string) ?? undefined}
          emptyMessage={(content.emptyMessage as string) ?? undefined}
        />
      );
    }
    case 'banner_slider': {
      const pos = (content.position as string) ?? 'home_top';
      const items = banners.filter((b) => b.position === pos);
      return items.length > 0 ? (
        <BannerSlider
          key={key}
          items={items.map((b) => ({
            id: b.id,
            title: b.title,
            subtitle: b.subtitle ?? null,
            imageUrl: b.imageUrl,
            linkUrl: b.linkUrl ?? null,
          }))}
        />
      ) : null;
    }
    case 'cta':
      return <DynamicCta key={key} content={content} variant={variant} />;
    case 'partners':
      return <Partners key={key} content={content as PartnersContent} />;
    case 'running_ads':
      return (
        <Ticker
          key={key}
          fallbackItems={(content as RunningAdsContent).fallbackItems as RunningAdsTickerItem[] | undefined}
        />
      );
    case 'how_to_order':
    case 'method':
      return <HowToOrder key={key} content={content as HowToOrderContent} />;
    case 'custom_html':
      return <CustomHtmlSection key={key} html={(content.html as string) ?? ''} />;
    case 'spacer':
      return (
        <Spacer key={key} height={(content.height as 'sm' | 'md' | 'lg' | 'xl') ?? 'md'} />
      );
    default:
      return null;
  }
}

export { renderMarkdown };
