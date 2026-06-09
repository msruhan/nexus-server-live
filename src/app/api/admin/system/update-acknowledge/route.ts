/**
 * POST /api/admin/system/update-acknowledge — Record a successful Docker update in history.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/sub-admin';
import { acknowledgeDockerUpdateRecord } from '@/lib/license/docker-updater';

const schema = z.object({
  targetVersion: z.string().min(1).max(32),
  fromVersion: z.string().min(1).max(32).optional(),
});

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid' }, { status: 400 });
  }

  const result = await acknowledgeDockerUpdateRecord(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, created: result.created });
}
