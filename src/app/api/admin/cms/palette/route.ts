import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';
import { paletteSaveSchema, saveSitePalette } from '@/lib/save-site-palette';

export async function PUT(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const body = await req.json().catch(() => null);
  const parsed = paletteSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await saveSitePalette(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logActivity({
    userId: session?.user.id,
    action: 'cms.palette_updated',
    entity: 'SiteSettings',
    metadata: { template: result.template, hasCustom: result.hasCustom },
  });

  return NextResponse.json({ ok: true });
}
