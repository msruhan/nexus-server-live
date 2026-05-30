import { prisma } from '@/lib/db';
import { getTemplate, type PaletteTokens } from '@/lib/palettes';
import { paletteSaveSchema, type PaletteSaveInput } from '@/lib/save-user-palette';

export { paletteSaveSchema, type PaletteSaveInput };

export async function saveSitePalette(input: PaletteSaveInput) {
  const tmpl = getTemplate(input.paletteTemplate);
  if (!tmpl) {
    return { ok: false as const, error: 'Unknown template' };
  }

  let custom: Partial<PaletteTokens> | null = null;
  if (input.paletteCustom) {
    const entries = Object.entries(input.paletteCustom).map(([k, v]) => {
      const raw = String(v).trim();
      const hex = raw.startsWith('#') ? raw : `#${raw}`;
      return [k, hex.toLowerCase()];
    });
    if (entries.length > 0) {
      custom = Object.fromEntries(entries) as Partial<PaletteTokens>;
    }
  }

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {
      paletteTemplate: input.paletteTemplate,
      paletteCustom: custom ? JSON.stringify(custom) : null,
      primaryColor: custom?.['primary-500'] ?? tmpl.tokens['primary-500'],
    },
    create: {
      id: 'singleton',
      paletteTemplate: input.paletteTemplate,
      paletteCustom: custom ? JSON.stringify(custom) : null,
      primaryColor: custom?.['primary-500'] ?? tmpl.tokens['primary-500'],
    },
  });

  return {
    ok: true as const,
    template: input.paletteTemplate,
    hasCustom: !!custom,
  };
}
