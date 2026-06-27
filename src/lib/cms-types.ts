// Supported PageSection types and their content shapes.

export const SECTION_TYPES = [
  'hero',
  'stats',
  'features',
  'service_catalog',
  'how_to_order',
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
  how_to_order: 'How to order',
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
  how_to_order: 'Three-step guide: browse, order, and track.',
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
  how_to_order: 'Path',
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
  eyebrow?: string;
  /** Supports `{italic:word}` and `{count}` (replaced with stat item count). */
  heading?: string;
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
  emptyMessage?: string;
};

export type TestimonialsContent = {
  heading?: string;
  pullId?: string;
  emptyMessage?: string;
};

export type BannerSliderContent = {
  position?: string; // banner.position
  autoplay?: boolean;
};

export type CatalogServiceRow = {
  ref: string;
  title: string;
  meta: string;
  delivery: string;
  price: string;
  popular?: boolean;
  tag?: string;
  orderHref?: string;
  /** Linked marketplace service — title/price/delivery sync on publish. */
  serviceId?: string;
  kind?: 'imei' | 'server';
};

export type ServiceCatalogContent = {
  eyebrow?: string;
  heading?: string;
  subhead?: string;
  imeiTabLabel?: string;
  serverTabLabel?: string;
  footerText?: string;
  catalogLinkText?: string;
  catalogLinkHref?: string;
  imeiServices?: CatalogServiceRow[];
  serverServices?: CatalogServiceRow[];
};

export type PartnersContent = {
  eyebrow?: string;
  subtitle?: string;
  row1?: string[];
  row2?: string[];
};

export type RunningAdsTickerItem = {
  tag: string;
  text: string;
  href?: string;
};

export type RunningAdsContent = {
  /** Shown when no items exist in Admin → Running ads. */
  fallbackItems?: RunningAdsTickerItem[];
};

export type HowToOrderStep = {
  no: string;
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  icon?: 'search' | 'cart' | 'map';
};

export type HowToOrderContent = {
  eyebrow?: string;
  heading?: string;
  subhead?: string;
  steps?: HowToOrderStep[];
  ctaBrowseHref?: string;
  ctaBrowseLabel?: string;
  ctaTrackHref?: string;
  ctaTrackLabel?: string;
  bottomBrowseLabel?: string;
  bottomTrackLabel?: string;
};

export function defaultContent(type: SectionType): unknown {
  switch (type) {
    case 'hero':
      return {
        eyebrow: 'Vol. 01 · The Reseller Edition',
        heading: 'A quiet desk for {italic:loud, urgent} {italic:phone problems.}',
        subhead:
          'Self-service platform for IMEI unlocks, iCloud removals, FRP bypass, and server flashing.',
        ctaText: 'Browse the catalog',
        ctaHref: '/services',
        secondaryText: 'How to order',
        secondaryHref: '#how-to-order',
        visualVariant: 'ticket',
      } satisfies HeroContent;
    case 'stats':
      return {
        eyebrow: 'The numbers',
        heading: 'The desk in {count} figures.',
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
      return {
        heading: 'Things people {italic:always} ask.',
        emptyMessage: 'No FAQ entries yet. Add items in Admin → FAQ.',
      } satisfies FaqContent;
    case 'testimonials':
      return {
        heading: 'What the {italic:resellers} say.',
        emptyMessage: 'No testimonials yet. Add items in Admin → Testimonials.',
      } satisfies TestimonialsContent;
    case 'banner_slider':
      return { position: 'home_top', autoplay: true } satisfies BannerSliderContent;
    case 'how_to_order':
      return {
        eyebrow: '§ How it works',
        heading: 'Order in {italic:three simple steps}.',
        subhead:
          'Browse the catalog, place your order as a guest or signed-in user, then track progress anytime.',
        steps: [
          {
            no: '01',
            icon: 'search',
            title: 'Browse services',
            body: 'Explore IMEI and server tool categories on the marketplace. Compare prices, delivery windows, and required fields before you order.',
            ctaHref: '/marketplace',
            ctaLabel: 'Open marketplace',
          },
          {
            no: '02',
            icon: 'cart',
            title: 'Place your order',
            body: 'Fill in the device details your service needs. Pay as a guest with supported gateways, or sign in to use your wallet balance.',
            ctaHref: '/marketplace',
            ctaLabel: 'Start ordering',
          },
          {
            no: '03',
            icon: 'map',
            title: 'Track progress',
            body: 'Use your order code or account to follow status updates from submission through completion.',
            ctaHref: '/track',
            ctaLabel: 'Track order',
          },
        ],
        ctaBrowseHref: '/marketplace',
        ctaBrowseLabel: 'Open marketplace',
        ctaTrackHref: '/track',
        ctaTrackLabel: 'Track order',
        bottomBrowseLabel: 'Browse marketplace',
        bottomTrackLabel: 'Track an order',
      } satisfies HowToOrderContent;
    case 'service_catalog':
      return {
        eyebrow: '§ 01 · Catalog',
        heading: 'The portal&rsquo;s {italic:working} menu.',
        subhead:
          'Two service tracks. One portal. Everything below is live, priced final, and synced automatically from upstream — when an operator drops support, the line disappears from this page.',
        imeiTabLabel: 'Unlock services',
        serverTabLabel: 'Remote services',
        footerText: '{count} entries shown · roughly 200+ live in the full catalog',
        catalogLinkText: 'Open the full catalog',
        catalogLinkHref: '/marketplace',
        imeiServices: [
          {
            ref: 'A.205',
            title: 'iPhone iCloud Clean Removal',
            meta: 'all models · clean status only',
            delivery: '3–7 days',
            price: '$26.99',
            popular: true,
            tag: 'Most ordered',
            orderHref: '/marketplace',
          },
          {
            ref: 'A.101',
            title: 'Samsung S24 · T-Mobile USA',
            meta: 'network unlock · all variants',
            delivery: '1–48 hours',
            price: '$5.99',
            orderHref: '/marketplace',
          },
          {
            ref: 'A.118',
            title: 'iPhone premium check',
            meta: 'GSX · blacklist · sim-lock · warranty',
            delivery: 'instant',
            price: '$0.99',
            orderHref: '/marketplace',
          },
          {
            ref: 'A.142',
            title: 'Carrier unlock · universal',
            meta: 'AT&T · Verizon · EE · Vodafone',
            delivery: '2–24 hours',
            price: '$9.99',
            orderHref: '/marketplace',
          },
          {
            ref: 'A.087',
            title: 'Sprint USA premium unlock',
            meta: 'all models · including blacklisted',
            delivery: '24–72 hours',
            price: '$14.99',
            orderHref: '/marketplace',
          },
        ],
        serverServices: [
          {
            ref: 'B.301',
            title: 'Samsung FRP bypass · remote',
            meta: 'all Galaxy models · session-based',
            delivery: '10–30 minutes',
            price: '$4.99',
            popular: true,
            tag: 'Fastest',
            orderHref: '/marketplace',
          },
          {
            ref: 'B.314',
            title: 'Xiaomi Mi Account removal',
            meta: 'Mi · Redmi · POCO · permanent',
            delivery: '15–60 minutes',
            price: '$7.99',
            orderHref: '/marketplace',
          },
          {
            ref: 'B.327',
            title: 'iPhone software repair',
            meta: 'DFU error · iTunes 9/14/4013 · boot loop',
            delivery: '20–90 minutes',
            price: '$6.99',
            orderHref: '/marketplace',
          },
          {
            ref: 'B.412',
            title: 'Firmware flash · official',
            meta: 'Samsung · Xiaomi · Vivo · OPPO · Realme',
            delivery: '15–45 minutes',
            price: '$4.49',
            orderHref: '/marketplace',
          },
          {
            ref: 'B.452',
            title: 'EFS / baseband repair',
            meta: 'Qualcomm + MediaTek devices',
            delivery: '30–60 minutes',
            price: '$8.99',
            orderHref: '/marketplace',
          },
        ],
      } satisfies ServiceCatalogContent;
    case 'partners':
      return {
        eyebrow: 'Brands & carriers · supported',
        subtitle: 'partial list, alphabetised',
        row1: ['Samsung', 'Apple', 'Xiaomi', 'OPPO', 'Vivo', 'Realme', 'Huawei', 'Honor'],
        row2: ['Google · Pixel', 'OnePlus', 'Motorola', 'Sony', 'Nokia', 'Asus', 'Tecno', 'Infinix'],
      } satisfies PartnersContent;
    case 'running_ads':
      return {
        fallbackItems: [
          { tag: 'LIVE', text: 'iCloud Clean Removal · 6m 24s avg' },
          { tag: 'NEW', text: 'Samsung S24 USA carrier unlock added' },
          { tag: 'NOTE', text: 'Polling cadence locked at 60 seconds' },
          { tag: 'REFUND', text: 'Auto-credit on REJECTED status' },
          { tag: 'UPSTREAM', text: 'DhruFusion API · 99.9% uptime / 30d' },
        ],
      } satisfies RunningAdsContent;
    default:
      return {};
  }
}
