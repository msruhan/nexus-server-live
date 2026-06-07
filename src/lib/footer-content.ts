/**
 * Footer CMS content stored in SiteSettings.footerContent (JSON string).
 */

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export type FooterNewsletter = {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  emailPlaceholder: string;
  buttonLabel: string;
};

export type FooterContent = {
  /** Paragraph under the large wordmark. Falls back to SiteSettings.footerText. */
  introText?: string | null;
  newsletter: FooterNewsletter;
  /** `columns` = structured link groups; `menus` = NavigationMenu location=footer flat list. */
  linkMode: 'columns' | 'menus';
  columns: FooterColumn[];
};

export const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Catalog',
    links: [
      { label: 'Unlock services', href: '/services/imei' },
      { label: 'Remote services', href: '/services/server' },
    ],
  },
  {
    title: 'The desk',
    links: [
      { label: 'How it works', href: '#how-to-order' },
      { label: 'Voices', href: '#voices' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'FAQ', href: '#notes' },
      { label: 'System status', href: '#' },
    ],
  },
];

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  introText: null,
  newsletter: {
    enabled: true,
    eyebrow: '',
    heading: 'The dispatch — engineering notes, supplier updates, occasional essays.',
    emailPlaceholder: 'your@email.com',
    buttonLabel: 'Subscribe',
  },
  linkMode: 'columns',
  columns: DEFAULT_FOOTER_COLUMNS,
};

function normalizeLink(link: unknown): FooterLink | null {
  if (!link || typeof link !== 'object') return null;
  const o = link as Record<string, unknown>;
  const label = typeof o.label === 'string' ? o.label.trim() : '';
  const href = typeof o.href === 'string' ? o.href.trim() : '';
  if (!label || !href) return null;
  return { label, href };
}

function normalizeColumn(col: unknown): FooterColumn | null {
  if (!col || typeof col !== 'object') return null;
  const o = col as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!title) return null;
  const links = Array.isArray(o.links)
    ? o.links.map(normalizeLink).filter((l): l is FooterLink => l !== null)
    : [];
  return { title, links };
}

export function parseFooterContent(raw: string | null | undefined): FooterContent {
  if (!raw?.trim()) return { ...DEFAULT_FOOTER_CONTENT, columns: DEFAULT_FOOTER_COLUMNS.map((c) => ({ ...c, links: [...c.links] })) };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const newsletterRaw = (parsed.newsletter && typeof parsed.newsletter === 'object'
      ? parsed.newsletter
      : {}) as Record<string, unknown>;

    const columns = Array.isArray(parsed.columns)
      ? parsed.columns.map(normalizeColumn).filter((c): c is FooterColumn => c !== null)
      : DEFAULT_FOOTER_COLUMNS.map((c) => ({ ...c, links: [...c.links] }));

    return {
      introText: typeof parsed.introText === 'string' ? parsed.introText : null,
      newsletter: {
        enabled: newsletterRaw.enabled !== false,
        eyebrow: typeof newsletterRaw.eyebrow === 'string' ? newsletterRaw.eyebrow : '',
        heading:
          typeof newsletterRaw.heading === 'string' && newsletterRaw.heading.trim()
            ? newsletterRaw.heading
            : DEFAULT_FOOTER_CONTENT.newsletter.heading,
        emailPlaceholder:
          typeof newsletterRaw.emailPlaceholder === 'string' && newsletterRaw.emailPlaceholder.trim()
            ? newsletterRaw.emailPlaceholder
            : DEFAULT_FOOTER_CONTENT.newsletter.emailPlaceholder,
        buttonLabel:
          typeof newsletterRaw.buttonLabel === 'string' && newsletterRaw.buttonLabel.trim()
            ? newsletterRaw.buttonLabel
            : DEFAULT_FOOTER_CONTENT.newsletter.buttonLabel,
      },
      linkMode: parsed.linkMode === 'menus' ? 'menus' : 'columns',
      columns: columns.length > 0 ? columns : DEFAULT_FOOTER_COLUMNS.map((c) => ({ ...c, links: [...c.links] })),
    };
  } catch {
    return { ...DEFAULT_FOOTER_CONTENT, columns: DEFAULT_FOOTER_COLUMNS.map((c) => ({ ...c, links: [...c.links] })) };
  }
}

export type FooterSettingsSlice = {
  siteName: string;
  siteTagline: string;
  footerText: string | null;
  copyrightText: string | null;
  brandShowPoweredBy: boolean;
  socialInstagram: string | null;
  socialTiktok: string | null;
  socialWhatsapp: string | null;
  socialTelegram: string | null;
  socialFacebook: string | null;
  socialYoutube: string | null;
};

export function resolveFooterForRender(
  content: FooterContent,
  settings: FooterSettingsSlice,
) {
  const introText =
    content.introText?.trim() ||
    settings.footerText?.trim() ||
    'A self-service unlock operations portal for resellers and technicians.';

  const newsletterEyebrow = content.newsletter.eyebrow.trim() || settings.siteTagline;

  const copyright =
    settings.copyrightText?.trim() ||
    `© ${new Date().getFullYear()} ${settings.siteName} · All rights reserved`;

  return {
    siteName: settings.siteName,
    introText,
    copyright,
    brandShowPoweredBy: settings.brandShowPoweredBy,
    newsletter: content.newsletter,
    newsletterEyebrow,
    linkMode: content.linkMode,
    columns: content.columns,
    socials: {
      instagram: settings.socialInstagram,
      tiktok: settings.socialTiktok,
      whatsapp: settings.socialWhatsapp,
      telegram: settings.socialTelegram,
      facebook: settings.socialFacebook,
      youtube: settings.socialYoutube,
    },
  };
}
