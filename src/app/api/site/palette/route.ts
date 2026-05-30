import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';
import { paletteSaveSchema, saveSitePalette } from '@/lib/save-site-palette';

/** PUT — update public-site palette (landing). Use /api/user/palette for account themes. */
export async function PUT(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = paletteSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await saveSitePalette(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  await logActivity({
    userId: session.user.id,
    action: 'site.palette_updated',
    entity: 'SiteSettings',
    metadata: { template: result.template, hasCustom: result.hasCustom, role: session.user.role },
  });

  return NextResponse.json({ success: true, ok: true });
}
