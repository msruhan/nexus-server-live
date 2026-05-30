import { prisma } from './db';
import { DEFAULT_PALETTE, getTemplate, paletteToCssVars, type PaletteTokens } from './palettes';

function parseCustom(raw: string | null | undefined): Partial<PaletteTokens> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Partial<PaletteTokens>;
  } catch {
    /* fallthrough */
  }
  return {};
}

function mergePalette(templateId: string, customRaw: string | null | undefined): PaletteTokens {
  const template = getTemplate(templateId) ?? DEFAULT_PALETTE;
  const custom = parseCustom(customRaw ?? null);
  return { ...template.tokens, ...custom };
}

/** Public site / landing — from SiteSettings singleton. */
export async function getSitePaletteCss(): Promise<string> {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
    const merged = mergePalette(settings?.paletteTemplate ?? 'editorial', settings?.paletteCustom);
    return paletteToCssVars(merged);
  } catch {
    return paletteToCssVars(DEFAULT_PALETTE.tokens);
  }
}

export async function getSitePaletteSummary() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  const template = getTemplate(settings?.paletteTemplate ?? 'editorial') ?? DEFAULT_PALETTE;
  const custom = parseCustom(settings?.paletteCustom ?? null);
  return {
    templateId: template.id,
    templateName: template.name,
    template,
    custom,
    merged: { ...template.tokens, ...custom } as PaletteTokens,
  };
}

/** Signed-in account dashboard — per User row. */
export async function getUserPaletteCss(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paletteTemplate: true, paletteCustom: true },
    });
    if (!user) return paletteToCssVars(DEFAULT_PALETTE.tokens);
    const merged = mergePalette(user.paletteTemplate, user.paletteCustom);
    return paletteToCssVars(merged);
  } catch {
    return paletteToCssVars(DEFAULT_PALETTE.tokens);
  }
}

export async function getUserPaletteSummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { paletteTemplate: true, paletteCustom: true },
  });
  const templateId = user?.paletteTemplate ?? 'editorial';
  const template = getTemplate(templateId) ?? DEFAULT_PALETTE;
  const custom = parseCustom(user?.paletteCustom ?? null);
  return {
    templateId: template.id,
    templateName: template.name,
    template,
    custom,
    merged: { ...template.tokens, ...custom } as PaletteTokens,
  };
}

/** @deprecated Use getSitePaletteCss — kept for any legacy imports. */
export const getActivePaletteCss = getSitePaletteCss;

/** @deprecated Use getSitePaletteSummary or getUserPaletteSummary. */
export const getActivePaletteSummary = getSitePaletteSummary;
