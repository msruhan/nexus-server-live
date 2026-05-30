/**
 * GET /api/admin/system/update-progress — Poll update progress
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/sub-admin';
import { getUpdateProgress } from '@/lib/license/updater';

export const dynamic = 'force-dynamic';

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

export async function GET() {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const progress = getUpdateProgress();
  return NextResponse.json(progress);
}
