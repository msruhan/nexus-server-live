// Supported PageSection types and their content shapes.

export const SECTION_TYPES = [
  'hero',
  'stats',
  'features',
  'service_catalog',
  'method',
  'testimonials',
  'faq',
  'banner_slider',
  'cta',
  'partners',
  'running_ads',
  'custom_html',
  'spacer',
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: 'Hero',
  stats: 'Stats counter',
  features: 'Features grid',
  service_catalog: 'Service catalog',
  method: 'Method timeline',
  testimonials: 'Testimonials',
  faq: 'FAQ accordion',
  banner_slider: 'Banner slider',
  cta: 'Call to action',
  partners: 'Partners marquee',
  running_ads: 'Running ads strip',
  custom_html: 'Custom HTML',
  spacer: 'Spacer',
};

export const SECTION_DESCRIPTIONS: Record<SectionType, string> = {
  hero: 'Editorial headline, subhead, CTAs, and live order ticket.',
  stats: 'Large counter figures with labels.',
  features: 'Bento grid of value propositions.',
  service_catalog: 'Live catalog with IMEI / Server tabs.',
  method: 'Seven-step timeline of how an order moves through the desk.',
  testimonials: 'Pull-quote and grid of voices.',
  faq: 'Accordion Q&A from the FAQ table.',
  banner_slider: 'Promo carousel from the Banner table.',
  cta: 'Final call-to-action panel.',
  partners: 'Brand marquee strip.',
  running_ads: 'Inline ticker strip in body.',
  custom_html: 'Free-form HTML / Markdown block.',
  spacer: 'Vertical breathing room.',
};

export const SECTION_ICONS: Record<SectionType, string> = {
  hero: 'Lightning',
  stats: 'ChartLineUp',
  features: 'GridFour',
  service_catalog: 'ListChecks',
  method: 'TreeStructure',
  testimonials: 'ChatTeardrop',
  faq: 'Question',
  banner_slider: 'Image',
  cta: 'Megaphone',
  partners: 'Buildings',
  running_ads: 'TextAa',
  custom_html: 'CodeSimple',
  spacer: 'Minus',
};

// Content shapes (loose — admin can edit JSON in advanced mode).

export type HeroContent = {
  eyebrow?: string;
  heading?: string; // supports {italic:word} markup
  subhead?: string;
  ctaText?: string;
  ctaHref?: string;
  secondaryText?: string;
  secondaryHref?: string;
  visualVariant?: 'ticket' | 'console' | 'dashboard' | 'phone';
};

export type StatsContent = {
  items: Array<{ label: string; value: string; note?: string }>;
};

export type FeaturesContent = {
  heading?: string;
  columns?: number;
  items: Array<{ num?: string; title: string; description: string }>;
};

export type CtaContent = {
  eyebrow?: string;
  heading?: string;
  subhead?: string;
  ctaText?: string;
  ctaHref?: string;
};

export type SpacerContent = {
  height?: 'sm' | 'md' | 'lg' | 'xl';
};

export type CustomHtmlContent = {
  html?: string;
};

export type FaqContent = {
  category?: string;
  heading?: string;
};

export type TestimonialsContent = {
  heading?: string;
  pullId?: string;
};

export type BannerSliderContent = {
  position?: string; // banner.position
  autoplay?: boolean;
};

export type RunningAdsContent = Record<string, never>;
export type ServiceCatalogContent = Record<string, never>;
export type PartnersContent = Record<string, never>;

export function defaultContent(type: SectionType): unknown {
  switch (type) {
    case 'hero':
      return {
        eyebrow: 'Vol. 01 · The Reseller Edition',
        heading: 'A quiet desk for {italic:loud, urgent} {italic:phone problems.}',
        subhead:
          'Self-service bureau for IMEI unlocks, iCloud removals, FRP bypass, and server flashing.',
        ctaText: 'Browse the catalog',
        ctaHref: '/services',
        secondaryText: 'How a job moves through the desk',
        secondaryHref: '#method',
        visualVariant: 'ticket',
      } satisfies HeroContent;
    case 'stats':
      return {
        items: [
          { label: 'Active counters', value: '12,400+', note: 'Resellers, technicians, repair shops' },
          { label: 'Closed successful', value: '98.7%', note: 'Last 30 days' },
          { label: 'Median delivery', value: '134s', note: 'Network unlocks' },
          { label: 'Operators supported', value: '200+', note: 'Auto-synced' },
        ],
      } satisfies StatsContent;
    case 'features':
      return {
        heading: 'Six things we won&rsquo;t {italic:compromise} on.',
        columns: 3,
        items: [
          { num: '01', title: 'Auto-refund', description: 'REJECTED upstream → wallet credited in seconds.' },
          { num: '02', title: '60-second cadence', description: 'Worker visits upstream every minute.' },
          { num: '03', title: 'Wallet ledger', description: 'Every entry immutable, timestamped.' },
          { num: '04', title: 'Auto-sync', description: 'Catalog tracks the upstream daily.' },
          { num: '05', title: 'Tight by design', description: 'bcrypt, RBAC, encrypted keys, activity log.' },
          { num: '06', title: 'Stale watcher', description: 'Anything > 72h flagged for review.' },
        ],
      } satisfies FeaturesContent;
    case 'cta':
      return {
        eyebrow: '§ Open an account',
        heading: 'Your first docket can land {italic:before your coffee} goes cold.',
        subhead: 'Free to register. Top-up from $1.00.',
        ctaText: 'Open account',
        ctaHref: '/register',
      } satisfies CtaContent;
    case 'spacer':
      return { height: 'md' } satisfies SpacerContent;
    case 'custom_html':
      return { html: '<p>Your custom HTML here.</p>' } satisfies CustomHtmlContent;
    case 'faq':
      return { heading: 'Things people {italic:always} ask.' } satisfies FaqContent;
    case 'testimonials':
      return { heading: 'What the {italic:resellers} say.' } satisfies TestimonialsContent;
    case 'banner_slider':
      return { position: 'home_top', autoplay: true } satisfies BannerSliderContent;
    default:
      return {};
  }
}
