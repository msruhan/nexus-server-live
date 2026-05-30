import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';
import { paletteSaveSchema, saveUserPalette } from '@/lib/save-user-palette';

/** PUT — save palette for the current account only (member or admin desk). */
export async function PUT(req: Request) {
  const { error, session } = await requireApiAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = paletteSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await saveUserPalette(session.user.id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  await logActivity({
    userId: session.user.id,
    action: 'user.palette_updated',
    entity: 'User',
    entityId: session.user.id,
    metadata: { template: result.template, hasCustom: result.hasCustom, role: session.user.role },
  });

  return NextResponse.json({ success: true, ok: true });
}
