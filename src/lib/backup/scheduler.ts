/**
 * Background scheduler: run automated database backups on the configured
 * cadence (daily / weekly / monthly at a chosen hour).
 *
 * Behaviour:
 *   - Ticks every 15 minutes and runs a backup when `backupNextRunAt` is due
 *     and scheduling is enabled.
 *   - No-op when backupScheduleEnabled=false (default), so existing
 *     deployments are unaffected.
 *
 * Started from instrumentation.node.ts together with the other schedulers.
 */
import { isPrismaMissingTableError } from '@/lib/db-schema-ready';
import { prisma } from '@/lib/db';
import { runBackup, computeNextRun, type BackupTrigger } from './manager';

const TICK_MS = 15 * 60 * 1000; // every 15 minutes

const globalForScheduler = globalThis as typeof globalThis & {
  __backupSchedulerStarted?: boolean;
  __backupSchedulerRunning?: boolean;
  __backupSchedulerMissingDbWarned?: boolean;
};

async function tick(): Promise<void> {
  if (globalForScheduler.__backupSchedulerRunning) return;
  globalForScheduler.__backupSchedulerRunning = true;
  try {
    const s = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        backupScheduleEnabled: true,
        backupFrequency: true,
        backupHour: true,
        backupNextRunAt: true,
      },
    });

    if (!s?.backupScheduleEnabled) return;

    const now = new Date();
    const hour = s.backupHour ?? 3;
    const frequency = s.backupFrequency ?? 'daily';

    // Initialize the next-run marker the first time scheduling is on.
    if (!s.backupNextRunAt) {
      await prisma.siteSettings.update({
        where: { id: 'singleton' },
        data: { backupNextRunAt: computeNextRun(frequency, hour, now) },
      });
      return;
    }

    if (s.backupNextRunAt > now) return; // not due yet

    // Due — run the backup, then schedule the next one.
    const result = await runBackup({ trigger: frequency as BackupTrigger });
    if (!result.ok) {
      console.warn('[BACKUP_SCHEDULER] Scheduled backup failed:', result.error);
    }

    await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: {
        backupLastRunAt: now,
        backupNextRunAt: computeNextRun(frequency, hour, new Date(now.getTime() + 60_000)),
      },
    });
  } catch (e) {
    if (isPrismaMissingTableError(e)) {
      if (!globalForScheduler.__backupSchedulerMissingDbWarned) {
        globalForScheduler.__backupSchedulerMissingDbWarned = true;
        console.warn('[BACKUP_SCHEDULER] Tables missing — run npm run db:setup');
      }
      return;
    }
    console.error('[BACKUP_SCHEDULER] tick error:', e);
  } finally {
    globalForScheduler.__backupSchedulerRunning = false;
  }
}

export function startBackupScheduler(): void {
  if (process.env.BACKUP_SCHEDULER_ENABLED === 'false') {
    console.log('[BACKUP_SCHEDULER] Disabled via BACKUP_SCHEDULER_ENABLED=false');
    return;
  }
  if (globalForScheduler.__backupSchedulerStarted) return;
  globalForScheduler.__backupSchedulerStarted = true;

  console.log('[BACKUP_SCHEDULER] Active — checking schedule every 15m');
  setTimeout(() => void tick(), 30_000);
  setInterval(() => void tick(), TICK_MS);
}
