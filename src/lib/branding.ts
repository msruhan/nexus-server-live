/**
 * Central branding resolver.
 *
 * Single source of truth for white-label identity (name, tagline, logo,
 * favicon, support email, footer, "Powered by" toggle, invoice prefix).
 *
 * Pulls from the SiteSettings singleton with sane fallbacks. Cached for
 * 30s to avoid hammering the DB on every render. Purely additive — does
 * not touch any order / API-management flow.
 */
import { prisma } from '@/lib/db';

export type Branding = {
  siteName: string;
  tagline: string;
  logoUrl: string | null;
  logoIconUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  supportEmail: string | null;
  footerText: string | null;
  copyrightText: string | null;
  showPoweredBy: boolean;
  invoicePrefix: string;
  metaTitle: string | null;
  metaDescription: string | null;
};

const DEFAULTS: Branding = {
  siteName: 'Recovero',
  tagline: 'IMEI & Server Hub',
  logoUrl: null,
  logoIconUrl: null,
  faviconUrl: null,
  primaryColor: '#2f63ff',
  supportEmail: null,
  footerText: null,
  copyrightText: null,
  showPoweredBy: true,
  invoicePrefix: 'INV',
  metaTitle: null,
  metaDescription: null,
};

let cached: { value: Branding; at: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getBranding(): Promise<Branding> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    const s = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
    const value: Branding = {
      siteName: s?.siteName?.trim() || DEFAULTS.siteName,
      tagline: s?.siteTagline?.trim() || DEFAULTS.tagline,
      logoUrl: s?.logoUrl || null,
      logoIconUrl: s?.faviconUrl || s?.logoUrl || null,
      faviconUrl: s?.faviconUrl || null,
      primaryColor: s?.primaryColor || DEFAULTS.primaryColor,
      supportEmail: s?.supportEmail || null,
      footerText: s?.footerText || null,
      copyrightText: s?.copyrightText || null,
      showPoweredBy: s?.brandShowPoweredBy ?? DEFAULTS.showPoweredBy,
      invoicePrefix: (s?.brandInvoicePrefix?.trim() || DEFAULTS.invoicePrefix)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8) || 'INV',
      metaTitle: s?.metaTitle || null,
      metaDescription: s?.metaDescription || null,
    };
    cached = { value, at: now };
    return value;
  } catch {
    return DEFAULTS;
  }
}

/** Drop the branding cache (call after admin saves branding settings). */
export function resetBrandingCache() {
  cached = null;
}
