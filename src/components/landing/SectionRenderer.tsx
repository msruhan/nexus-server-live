import { prisma } from '@/lib/db';
import { Hero } from './Hero';
import { Catalog } from './Catalog';
import { Method } from './Method';
import { Stats as DefaultStats } from './Stats';
import { Bento } from './Bento';
import { Voices } from './Voices';
import { Notes } from './Notes';
import { CTA as DefaultCta } from './CTA';
import { Partners } from './Partners';
import { DynamicHero } from './sections/DynamicHero';
import { DynamicStats } from './sections/DynamicStats';
import { DynamicCta } from './sections/DynamicCta';
import { DynamicFeatures } from './sections/DynamicFeatures';
import { CustomHtmlSection } from './sections/CustomHtmlSection';
import { Spacer } from './sections/Spacer';
import { BannerSlider } from './sections/BannerSlider';
import { SectionFrame } from './SectionFrame';
import { resolveSettings } from '@/lib/cms-style';
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
  // Pre-fetch shared data once
  const [faq, testimonials, banners] = await Promise.all([
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
  ]);

  return (
    <>
      {sections.map((s) => {
        const content = parseJson<Record<string, unknown>>(s.content, {});
        const { style, variant } = resolveSettings(s.settings, s.sectionType);
        const key = `${s.sectionType}-${s.id}`;
        const inner = renderSection(s.sectionType, key, content, variant, {
          faq,
          testimonials,
          banners,
        });
        if (!inner) return null;

        // Apply per-section visual style. SectionFrame is a zero-overhead
        // pass-through when the style is the per-type default, so existing
        // sections render exactly as before.
        const node = (
          <SectionFrame key={key} style={style} sectionType={s.sectionType}>
            {inner}
          </SectionFrame>
        );

        // If section is hidden, wrap with low-opacity + label badge so admins see it in preview.
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
};

function renderSection(
  sectionType: string,
  key: string,
  content: Record<string, unknown>,
  variant: string | null,
  shared: Shared,
): React.ReactNode {
  const { faq, testimonials, banners } = shared;
  switch (sectionType) {
    case 'hero':
      return Object.keys(content).length > 0 ? (
        <DynamicHero key={key} content={content} variant={variant} />
      ) : (
        <Hero key={key} />
      );
    case 'stats':
      return Object.keys(content).length > 0 ? (
        <DynamicStats key={key} content={content} variant={variant} />
      ) : (
        <DefaultStats key={key} />
      );
    case 'features':
      return Object.keys(content).length > 0 ? (
        <DynamicFeatures key={key} content={content} variant={variant} />
      ) : (
        <Bento key={key} />
      );
    case 'service_catalog':
      return <Catalog key={key} />;
    case 'testimonials': {
      const items = testimonials.map((t) => ({
        id: t.id,
        name: t.name,
        role: t.role ?? '',
        rating: t.rating,
        content: t.content,
      }));
      return items.length > 0 ? (
        <Voices key={key} items={items} heading={(content.heading as string) ?? undefined} />
      ) : (
        <Voices key={key} heading={(content.heading as string) ?? undefined} />
      );
    }
    case 'faq': {
      const cat = (content.category as string) ?? null;
      const items = (cat ? faq.filter((f) => f.category === cat) : faq).map((f) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
      }));
      return items.length > 0 ? (
        <Notes key={key} items={items} heading={(content.heading as string) ?? undefined} />
      ) : (
        <Notes key={key} heading={(content.heading as string) ?? undefined} />
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
      return Object.keys(content).length > 0 ? (
        <DynamicCta key={key} content={content} variant={variant} />
      ) : (
        <DefaultCta key={key} />
      );
    case 'partners':
      return <Partners key={key} />;
    case 'running_ads':
      return null;
    case 'method':
      return <Method key={key} />;
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
