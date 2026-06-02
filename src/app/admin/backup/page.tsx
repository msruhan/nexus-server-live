import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { BackupManager } from './BackupManager';

export const dynamic = 'force-dynamic';

export default async function AdminBackupPage() {
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

  return (
    <div className="max-w-5xl">
      <PageHeader
        section="§ Admin · system"
        title={
          <>
            Database <span className="font-serif italic font-normal">backups</span>.
          </>
        }
        subtitle="Create on-demand backups or schedule automatic daily, weekly, or monthly snapshots of your database."
      />
      <BackupManager
        initial={{
          smtp: {
            enabled: settings?.smtpEnabled ?? false,
            fromAddress: settings?.smtpFromAddress ?? null,
          },
          schedule: {
            enabled: settings?.backupScheduleEnabled ?? false,
            frequency: (settings?.backupFrequency ?? 'daily') as 'daily' | 'weekly' | 'monthly',
            hour: settings?.backupHour ?? 3,
            retention: settings?.backupRetention ?? 7,
            emailEnabled: settings?.backupEmailEnabled ?? false,
            emailTo: settings?.backupEmailTo ?? '',
            lastRunAt: settings?.backupLastRunAt?.toISOString() ?? null,
            nextRunAt: settings?.backupNextRunAt?.toISOString() ?? null,
          },
          backups: backups.map((b) => ({
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
          })),
        }}
      />
    </div>
  );
}
