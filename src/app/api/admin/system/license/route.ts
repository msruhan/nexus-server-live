/**
 * POST /api/admin/system/license — Activate / Deactivate / Validate license
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/sub-admin';
import { activateLicense, validateLicense } from '@/lib/license/client';

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

export async function POST(req: NextRequest) {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { action } = body;

  if (action === 'activate') {
    const { key } = body;
    if (!key || typeof key !== 'string' || key.length > 128) {
      return NextResponse.json({ error: 'Invalid license key' }, { status: 400 });
    }
    const result = await activateLicense(key.trim());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, info: result.info });
  }

  if (action === 'validate') {
    const result = await validateLicense();
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error });
    return NextResponse.json({ ok: true, info: result.info });
  }

  if (action === 'deactivate' || action === 'remove_local') {
    return NextResponse.json(
      { error: 'License deactivation is disabled. Contact your vendor for a replacement key.' },
      { status: 403 },
    );
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
