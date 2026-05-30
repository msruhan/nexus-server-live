import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Require ADMIN or SUB_ADMIN role. For granular permission checks on
 * SUB_ADMIN, use `hasPermission()` from `@/lib/sub-admin` after this guard.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null };
  }
  if ((session.user.role as string) !== 'ADMIN' && (session.user.role as string) !== 'SUB_ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), session };
  }
  return { error: null, session };
}
