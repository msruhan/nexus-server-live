/**
 * CMS section style + layout-variant system (Level 1 landing builder enrichment).
 *
 * Single source of truth for:
 *   - the per-section style schema + safe defaults
 *   - the layout-variant catalog per section type
 *   - a TOTAL resolver that never throws (clamps unknown/out-of-range to defaults)
 *   - Tailwind class helpers consumed by SectionFrame
 *   - a zod schema used by the admin API for validation
 *
 * Stored inside the existing `PageSection.settings` JSON column — NO schema change.
 * Empty settings resolve to defaults that reproduce the pre-feature appearance.
 */
import { z } from 'zod';

// ─── Style value unions ─────────────────────────────────────────
export type SectionBackground = 'paper' | 'ink' | 'primary' | 'gradient' | 'image';
export type SectionPadding = 'compact' | 'normal' | 'spacious';
export type SectionAlign = 'left' | 'center';
export type SectionWidth = 'narrow' | 'wide' | 'full';
export type SectionDivider = 'none' | 'line';

export const BACKGROUNDS: SectionBackground[] = ['paper', 'ink', 'primary', 'gradient', 'image'];
export const PADDINGS: SectionPadding[] = ['compact', 'normal', 'spacious'];
export const ALIGNS: SectionAlign[] = ['left', 'center'];
export const WIDTHS: SectionWidth[] = ['narrow', 'wide', 'full'];
export const DIVIDERS: SectionDivider[] = ['none', 'line'];

export type SectionStyle = {
  background: SectionBackground;
  padding: SectionPadding;
  align: SectionAlign;
  width: SectionWidth;
  dividerTop: SectionDivider;
  dividerBottom: SectionDivider;
  bgImageUrl: string | null;
  bgOverlay: number; // 0..100 integer
};

export const DEFAULT_STYLE: SectionStyle = {
  background: 'paper',
  padding: 'normal',
  align: 'left',
  width: 'wide',
  dividerTop: 'none',
  dividerBottom: 'none',
  bgImageUrl: null,
  bgOverlay: 0,
};

/**
 * Per-type default width so that empty settings reproduce the current
 * appearance (some sections are full-bleed today).
 */
export const DEFAULT_WIDTH_BY_TYPE: Record<string, SectionWidth> = {
  hero: 'full',
  partners: 'full',
  banner_slider: 'full',
  running_ads: 'full',
  cta: 'full',
  service_catalog: 'full',
  stats: 'full',
  features: 'full',
  method: 'full',
  how_to_order: 'full',
  testimonials: 'full',
  faq: 'full',
};

// ─── Layout variant catalog ─────────────────────────────────────
// Index 0 is the Default_Variant (reproduces current appearance).
export type VariantDef = { id: string; label: string };

export const VARIANTS: Record<string, VariantDef[]> = {
  hero: [
    { id: 'standard', label: 'Standard (two-column)' },
    { id: 'split-image', label: 'Split image' },
    { id: 'minimal-center', label: 'Minimal center' },
  ],
  features: [
    { id: 'bento', label: 'Bento grid' },
    { id: 'three-col', label: 'Three columns' },
    { id: 'four-col', label: 'Four columns' },
    { id: 'numbered-list', label: 'Numbered list' },
    { id: 'icon-left', label: 'Icon left' },
  ],
  stats: [
    { id: 'horizontal', label: 'Horizontal' },
    { id: 'grid', label: 'Grid' },
    { id: 'big-number', label: 'Big number' },
  ],
  cta: [
    { id: 'banner', label: 'Banner' },
    { id: 'boxed', label: 'Boxed' },
    { id: 'split', label: 'Split' },
  ],
};

export function hasVariants(sectionType: string): boolean {
  return Array.isArray(VARIANTS[sectionType]) && VARIANTS[sectionType].length > 0;
}

export function defaultVariant(sectionType: string): string | null {
  const list = VARIANTS[sectionType];
  return list && list.length > 0 ? list[0].id : null;
}

export function isValidVariant(sectionType: string, variant: string | null | undefined): boolean {
  if (!variant) return false;
  const list = VARIANTS[sectionType];
  return !!list && list.some((v) => v.id === variant);
}

// ─── URL safety ─────────────────────────────────────────────────
/**
 * Returns the URL only if it uses http/https or is a site-relative path
 * (begins with "/"). Otherwise null. Blocks javascript:, data:, vbscript:,
 * and other dangerous schemes (SSRF / XSS guard).
 */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Site-relative path (but not protocol-relative "//host").
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return trimmed;
    return null;
  } catch {
    return null;
  }
}

// ─── Resolver (TOTAL — never throws) ────────────────────────────
function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === 'string' && (allowed as string[]).includes(value) ? (value as T) : fallback;
}

function clampOverlay(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const i = Math.round(n);
  return Math.min(100, Math.max(0, i));
}

export type ResolvedSettings = { style: SectionStyle; variant: string | null };

/**
 * Resolve a raw `settings` value (string or object or null) into a fully
 * populated, safe object. Never throws. Unknown/out-of-range values fall
 * back to defaults. `sectionType` selects the per-type default width and
 * validates the variant.
 */
export function resolveSettings(raw: unknown, sectionType?: string): ResolvedSettings {
  let obj: Record<string, unknown> = {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') obj = parsed as Record<string, unknown>;
    } catch {
      obj = {};
    }
  } else if (raw && typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  }

  const styleRaw = (obj.style && typeof obj.style === 'object' ? obj.style : {}) as Record<string, unknown>;

  const defaultWidth = (sectionType && DEFAULT_WIDTH_BY_TYPE[sectionType]) || DEFAULT_STYLE.width;
  const background = oneOf<SectionBackground>(styleRaw.background, BACKGROUNDS, DEFAULT_STYLE.background);
  const bgImageUrl = background === 'image' ? safeUrl(styleRaw.bgImageUrl as string) : null;

  const style: SectionStyle = {
    background,
    padding: oneOf<SectionPadding>(styleRaw.padding, PADDINGS, DEFAULT_STYLE.padding),
    align: oneOf<SectionAlign>(styleRaw.align, ALIGNS, DEFAULT_STYLE.align),
    width: oneOf<SectionWidth>(styleRaw.width, WIDTHS, defaultWidth),
    dividerTop: oneOf<SectionDivider>(styleRaw.dividerTop, DIVIDERS, DEFAULT_STYLE.dividerTop),
    dividerBottom: oneOf<SectionDivider>(styleRaw.dividerBottom, DIVIDERS, DEFAULT_STYLE.dividerBottom),
    bgImageUrl,
    bgOverlay: clampOverlay(styleRaw.bgOverlay),
  };

  // Variant: validate against the section type when provided.
  let variant: string | null = null;
  const rawVariant = typeof obj.variant === 'string' ? (obj.variant as string) : null;
  if (sectionType) {
    variant = isValidVariant(sectionType, rawVariant) ? rawVariant : null;
  } else {
    variant = rawVariant;
  }

  return { style, variant };
}

/**
 * Whether a resolved style is effectively the per-type default (used by the
 * renderer to short-circuit to a zero-overhead pass-through — guarantees the
 * backward-compatibility identity property).
 */
export function isDefaultStyle(style: SectionStyle, sectionType?: string): boolean {
  const defaultWidth = (sectionType && DEFAULT_WIDTH_BY_TYPE[sectionType]) || DEFAULT_STYLE.width;
  return (
    style.background === 'paper' &&
    style.padding === 'normal' &&
    style.align === 'left' &&
    style.width === defaultWidth &&
    style.dividerTop === 'none' &&
    style.dividerBottom === 'none'
  );
}

// ─── Tailwind class helpers (consumed by SectionFrame) ──────────
export function backgroundClasses(s: SectionStyle): { wrapper: string; isDark: boolean } {
  switch (s.background) {
    case 'ink':
      return { wrapper: 'bg-ink text-paper', isDark: true };
    case 'primary':
      return { wrapper: 'bg-primary-500 text-paper', isDark: true };
    case 'gradient':
      return {
        wrapper: 'bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 text-paper',
        isDark: true,
      };
    case 'image':
      // Background image is rendered by SectionFrame as layers; wrapper is the
      // positioning context. Treat as dark for legibility.
      return { wrapper: 'bg-ink text-paper', isDark: true };
    case 'paper':
    default:
      return { wrapper: '', isDark: false };
  }
}

export function paddingClasses(p: SectionPadding): string {
  switch (p) {
    case 'compact':
      return 'py-8 lg:py-12';
    case 'spacious':
      return 'py-24 lg:py-36';
    case 'normal':
    default:
      return 'py-16 lg:py-24';
  }
}

export function widthClasses(w: SectionWidth): string {
  switch (w) {
    case 'narrow':
      return 'max-w-3xl';
    case 'full':
      return 'max-w-none';
    case 'wide':
    default:
      return 'max-w-[1400px]';
  }
}

export function alignClasses(a: SectionAlign): string {
  return a === 'center' ? 'text-center mx-auto' : '';
}

// ─── Zod schema for API validation ──────────────────────────────
export const sectionStyleSchema = z
  .object({
    background: z.enum(['paper', 'ink', 'primary', 'gradient', 'image']).optional(),
    padding: z.enum(['compact', 'normal', 'spacious']).optional(),
    align: z.enum(['left', 'center']).optional(),
    width: z.enum(['narrow', 'wide', 'full']).optional(),
    dividerTop: z.enum(['none', 'line']).optional(),
    dividerBottom: z.enum(['none', 'line']).optional(),
    bgImageUrl: z.string().max(2048).nullable().optional(),
    bgOverlay: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export const sectionSettingsSchema = z
  .object({
    style: sectionStyleSchema.optional(),
    variant: z.string().max(40).nullable().optional(),
  })
  .strict();

export type SectionSettingsInput = z.infer<typeof sectionSettingsSchema>;
