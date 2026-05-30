/**
 * POST /api/admin/system/update-check — Check for available updates
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/sub-admin';
import { checkForUpdate } from '@/lib/license/client';

async function requireAccess() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role ?? 'USER';
  if (role !== 'ADMIN' && role !== 'SUB_ADMIN') return null;
  if (role === 'SUB_ADMIN') {
    const allowed = await hasPermission(session.user.id, role, 'manageSystem');
    if (!allowed) return null;
  }
  return session;
}

export async function POST() {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const result = await checkForUpdate();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, ...result.info });
}
