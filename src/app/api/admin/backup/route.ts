/**
 * GET  /api/admin/backup  — list backups + current schedule settings
 * POST /api/admin/backup  — { action: 'run' | 'save_schedule', ... }
 *
 * Access: ADMIN, or SUB_ADMIN with the `manageBackups` permission.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/sub-admin';
import { logActivity } from '@/lib/activity';
import { runBackup, computeNextRun, isBackupInProgress } from '@/lib/backup/manager';

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

function serializeBackup(b: {
  id: string;
  filename: string;
  sizeBytes: bigint;
  trigger: string;
  status: string;
  error: string | null;
  durationMs: number | null;
  emailedAt: Date | null;
  emailError: string | null;
  startedAt: Date;
  completedAt: Date | null;
}) {
  return {
    id: b.id,
    filename: b.filename,
    sizeBytes: Number(b.sizeBytes),
    trigger: b.trigger,
    status: b.status,
    error: b.error,
    durationMs: b.durationMs,
    emailedAt: b.emailedAt?.toISOString() ?? null,
    emailError: b.emailError,
    startedAt: b.startedAt.toISOString(),
    completedAt: b.completedAt?.toISOString() ?? null,
  };
}

export async function GET() {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [settings, backups] = await Promise.all([
    prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        backupScheduleEnabled: true,
        backupFrequency: true,
        backupHour: true,
        backupRetention: true,
        backupEmailEnabled: true,
        backupEmailTo: true,
        backupLastRunAt: true,
        backupNextRunAt: true,
        smtpEnabled: true,
        smtpFromAddress: true,
      },
    }),
    prisma.databaseBackup.findMany({ orderBy: { startedAt: 'desc' }, take: 50 }),
  ]);

  return NextResponse.json({
    inProgress: isBackupInProgress(),
    smtp: {
      enabled: settings?.smtpEnabled ?? false,
      fromAddress: settings?.smtpFromAddress ?? null,
    },
    schedule: {
      enabled: settings?.backupScheduleEnabled ?? false,
      frequency: settings?.backupFrequency ?? 'daily',
      hour: settings?.backupHour ?? 3,
      retention: settings?.backupRetention ?? 7,
      emailEnabled: settings?.backupEmailEnabled ?? false,
      emailTo: settings?.backupEmailTo ?? '',
      lastRunAt: settings?.backupLastRunAt?.toISOString() ?? null,
      nextRunAt: settings?.backupNextRunAt?.toISOString() ?? null,
    },
    backups: backups.map(serializeBackup),
  });
}

const scheduleSchema = z.object({
  action: z.literal('save_schedule'),
  enabled: z.boolean(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  hour: z.number().int().min(0).max(23),
  retention: z.number().int().min(1).max(365),
  emailEnabled: z.boolean().optional(),
  emailTo: z.string().trim().max(254).optional().nullable(),
});

const runSchema = z.object({ action: z.literal('run') });

export async function POST(req: NextRequest) {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  // ── Run a manual backup now ──────────────────────────────────
  if (body?.action === 'run') {
    const parsed = runSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const result = await runBackup({ trigger: 'manual', createdBy: session.user.id });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });

    await logActivity({
      userId: session.user.id,
      action: 'backup.created',
      entity: 'DatabaseBackup',
      entityId: result.backupId,
      metadata: { trigger: 'manual', sizeBytes: result.sizeBytes },
    });

    return NextResponse.json({ ok: true, backupId: result.backupId, filename: result.filename });
  }

  // ── Save the schedule settings ───────────────────────────────
  if (body?.action === 'save_schedule') {
    const parsed = scheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid payload' },
        { status: 400 },
      );
    }
    const { enabled, frequency, hour, retention } = parsed.data;
    const emailEnabled = parsed.data.emailEnabled ?? false;
    const emailTo = parsed.data.emailTo?.trim() || null;

    // Validate recipient email format when provided.
    if (emailTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo)) {
      return NextResponse.json({ error: 'Invalid recipient email address' }, { status: 400 });
    }

    const nextRunAt = enabled ? computeNextRun(frequency, hour) : null;

    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: {
        backupScheduleEnabled: enabled,
        backupFrequency: frequency,
        backupHour: hour,
        backupRetention: retention,
        backupEmailEnabled: emailEnabled,
        backupEmailTo: emailTo,
        backupNextRunAt: nextRunAt,
      },
      create: {
        id: 'singleton',
        backupScheduleEnabled: enabled,
        backupFrequency: frequency,
        backupHour: hour,
        backupRetention: retention,
        backupEmailEnabled: emailEnabled,
        backupEmailTo: emailTo,
        backupNextRunAt: nextRunAt,
      },
    });

    await logActivity({
      userId: session.user.id,
      action: 'backup.schedule_updated',
      entity: 'SiteSettings',
      metadata: { enabled, frequency, hour, retention, emailEnabled },
    });

    return NextResponse.json({
      ok: true,
      nextRunAt: nextRunAt?.toISOString() ?? null,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
