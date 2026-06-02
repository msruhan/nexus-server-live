/**
 * POST /api/admin/backup/restore — restore the database from a backup.
 *
 * Two modes (multipart/form-data):
 *   - mode=upload  + file=<.sql.gz>   → restore from an uploaded file
 *   - mode=existing + backupId=<id>   → restore from a stored backup
 *
 * DESTRUCTIVE: overwrites the current database. A safety backup is taken
 * automatically before the restore is applied.
 *
 * Access: ADMIN only (not SUB_ADMIN) — this is a high-impact operation.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { restoreFromFile, backupFilePath, isRestoreInProgress } from '@/lib/backup/manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cap uploaded restore files (raw .gz) to keep memory/time bounded.
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role ?? 'USER';
  // Restore is ADMIN-only by design (destructive).
  if (role !== 'ADMIN') return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (isRestoreInProgress()) {
    return NextResponse.json({ error: 'A restore is already in progress.' }, { status: 409 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const mode = String(form.get('mode') ?? '');
  // Require an explicit confirmation token so this can't be triggered by accident.
  const confirm = String(form.get('confirm') ?? '');
  if (confirm !== 'RESTORE') {
    return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
  }

  // ── Restore from an existing stored backup ───────────────────
  if (mode === 'existing') {
    const backupId = String(form.get('backupId') ?? '');
    const backup = await prisma.databaseBackup.findUnique({ where: { id: backupId } });
    if (!backup || backup.status !== 'success') {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }
    const filePath = backupFilePath(backup.filename);
    if (!filePath) {
      return NextResponse.json({ error: 'Backup file is missing on disk' }, { status: 410 });
    }

    const result = await restoreFromFile({
      filePath,
      sourceLabel: backup.filename,
      createdBy: session.user.id,
    });

    await logActivity({
      userId: session.user.id,
      action: result.ok ? 'backup.restored' : 'backup.restore_failed',
      entity: 'DatabaseBackup',
      entityId: backupId,
      metadata: { source: 'existing', safetyBackupId: result.safetyBackupId ?? null },
    });

    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, safetyBackupId: result.safetyBackupId });
  }

  // ── Restore from an uploaded file ────────────────────────────
  if (mode === 'upload') {
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)` },
        { status: 413 },
      );
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.gz') && !lower.endsWith('.sql.gz')) {
      return NextResponse.json({ error: 'Only .sql.gz backup files are supported' }, { status: 400 });
    }

    // Write to a temp file, restore, then clean up.
    const tmpPath = path.join(os.tmpdir(), `nexus-restore-${crypto.randomBytes(6).toString('hex')}.sql.gz`);
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(tmpPath, buf);

      const result = await restoreFromFile({
        filePath: tmpPath,
        sourceLabel: file.name,
        createdBy: session.user.id,
      });

      await logActivity({
        userId: session.user.id,
        action: result.ok ? 'backup.restored' : 'backup.restore_failed',
        entity: 'DatabaseBackup',
        metadata: { source: 'upload', filename: file.name, safetyBackupId: result.safetyBackupId ?? null },
      });

      if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
      return NextResponse.json({ ok: true, safetyBackupId: result.safetyBackupId });
    } finally {
      try {
        if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath);
      } catch {
        /* ignore */
      }
    }
  }

  return NextResponse.json({ error: 'Unknown restore mode' }, { status: 400 });
}
