/**
 * GET    /api/admin/backup/[id]  — download the backup .sql.gz file
 * DELETE /api/admin/backup/[id]  — delete the backup (row + file)
 *
 * Access: ADMIN, or SUB_ADMIN with the `manageBackups` permission.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/sub-admin';
import { logActivity } from '@/lib/activity';
import { backupFilePath, deleteBackup, emailBackup } from '@/lib/backup/manager';

export const dynamic = 'force-dynamic';

async function requireAccess() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role ?? 'USER';
  if (role !== 'ADMIN' && role !== 'SUB_ADMIN') return null;
  if (role === 'SUB_ADMIN') {
    const allowed = await hasPermission(session.user.id, role, 'manageBackups');
    if (!allowed) return null;
  }
  return session;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const backup = await prisma.databaseBackup.findUnique({ where: { id } });
  if (!backup || backup.status !== 'success') {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
  }

  const filePath = backupFilePath(backup.filename);
  if (!filePath) {
    return NextResponse.json({ error: 'Backup file is missing on disk' }, { status: 410 });
  }

  await logActivity({
    userId: session.user.id,
    action: 'backup.downloaded',
    entity: 'DatabaseBackup',
    entityId: id,
  });

  const fileBuffer = fs.readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${backup.filename}"`,
      'Content-Length': String(fileBuffer.length),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const result = await deleteBackup(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });

  await logActivity({
    userId: session.user.id,
    action: 'backup.deleted',
    entity: 'DatabaseBackup',
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body?.action !== 'email') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const to = typeof body.to === 'string' && body.to.trim() ? body.to.trim() : null;
  const result = await emailBackup({ backupId: id, to });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });

  await logActivity({
    userId: session.user.id,
    action: 'backup.emailed',
    entity: 'DatabaseBackup',
    entityId: id,
    metadata: { to: to ?? 'default' },
  });

  return NextResponse.json({ ok: true });
}
