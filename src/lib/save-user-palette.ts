import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getTemplate, type PaletteTokens } from '@/lib/palettes';

const HEX_RE = /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

const tokenSchema = z.object({}).catchall(z.string().regex(HEX_RE, 'Invalid hex color'));

export const paletteSaveSchema = z.object({
  paletteTemplate: z.string().min(1),
  paletteCustom: tokenSchema.optional().nullable(),
});

export type PaletteSaveInput = z.infer<typeof paletteSaveSchema>;

function normalizeCustom(input: PaletteSaveInput['paletteCustom']): Partial<PaletteTokens> | null {
  if (!input) return null;
  const entries = Object.entries(input).map(([k, v]) => {
    const raw = String(v).trim();
    const hex = raw.startsWith('#') ? raw : `#${raw}`;
    return [k, hex.toLowerCase()];
  });
  if (entries.length === 0) return null;
  return Object.fromEntries(entries) as Partial<PaletteTokens>;
}

/** Persist palette on the signed-in user's account (dashboard theme only). */
export async function saveUserPalette(userId: string, input: PaletteSaveInput) {
  const tmpl = getTemplate(input.paletteTemplate);
  if (!tmpl) {
    return { ok: false as const, error: 'Unknown template' };
  }

  const custom = normalizeCustom(input.paletteCustom);

  await prisma.user.update({
    where: { id: userId },
    data: {
      paletteTemplate: input.paletteTemplate,
      paletteCustom: custom ? JSON.stringify(custom) : null,
    },
  });

  return {
    ok: true as const,
    template: input.paletteTemplate,
    hasCustom: !!custom,
  };
}
