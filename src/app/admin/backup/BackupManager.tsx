'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';
import {
  Database,
  DownloadSimple,
  Trash,
  Clock,
  CheckCircle,
  XCircle,
  HourglassMedium,
  PaperPlaneTilt,
  ArrowCounterClockwise,
  UploadSimple,
  Warning,
} from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';

type Frequency = 'daily' | 'weekly' | 'monthly';

type Schedule = {
  enabled: boolean;
  frequency: Frequency;
  hour: number;
  retention: number;
  emailEnabled: boolean;
  emailTo: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
};

type Backup = {
  id: string;
  filename: string;
  sizeBytes: number;
  trigger: string;
  status: string;
  error: string | null;
  durationMs: number | null;
  emailedAt: string | null;
  emailError: string | null;
  startedAt: string;
  completedAt: string | null;
};

type Initial = {
  smtp: { enabled: boolean; fromAddress: string | null };
  schedule: Schedule;
  backups: Backup[];
};

const FREQUENCIES: Array<{ id: Frequency; label: string; desc: string }> = [
  { id: 'daily', label: 'Daily', desc: 'Every day at the chosen hour' },
  { id: 'weekly', label: 'Weekly', desc: 'Every Monday at the chosen hour' },
  { id: 'monthly', label: 'Monthly', desc: 'On the 1st of each month' },
];

function formatBytes(n: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function BackupManager({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [schedule, setSchedule] = React.useState<Schedule>(initial.schedule);
  const [backups, setBackups] = React.useState<Backup[]>(initial.backups);
  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(backups, [backups.length]);
  const [running, setRunning] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [emailingId, setEmailingId] = React.useState<string | null>(null);
  const [restoring, setRestoring] = React.useState(false);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const smtp = initial.smtp;

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/backup');
      if (!res.ok) return;
      const data = await res.json();
      setBackups(data.backups);
      setSchedule((prev) => ({ ...prev, ...data.schedule }));
    } catch {
      /* ignore */
    }
  }, []);

  const onRestoreDone = React.useCallback(
    async (data: { ok?: boolean; error?: string; safetyBackupId?: string | null }, ok: boolean) => {
      if (!ok) {
        toast.error('Restore failed', { description: data.error ?? 'Unknown error' });
        return;
      }
      toast.success('Database restored', {
        description: data.safetyBackupId
          ? 'A safety backup of the previous state was created.'
          : 'Restore complete.',
      });
      await refresh();
      router.refresh();
    },
    [refresh, router],
  );

  const handleRestoreUpload = async (file: File) => {
    if (!file) return;
    const warn =
      'RESTORE WILL OVERWRITE the entire current database with the contents of:\n\n' +
      `${file.name}\n\n` +
      'A safety backup of the current state will be taken first. Continue?';
    if (!confirm(warn)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setRestoring(true);
    toast.info('Restoring…', { description: 'Taking a safety backup, then applying the restore.' });
    try {
      const fd = new FormData();
      fd.set('mode', 'upload');
      fd.set('confirm', 'RESTORE');
      fd.set('file', file);
      const res = await fetch('/api/admin/backup/restore', { method: 'POST', body: fd });
      const data = await res.json();
      await onRestoreDone(data, res.ok && data.ok);
    } catch {
      toast.error('Network error');
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestoreExisting = async (b: Backup) => {
    const warn =
      'RESTORE WILL OVERWRITE the entire current database with this backup:\n\n' +
      `${b.filename}\n(${formatDateTime(b.startedAt)})\n\n` +
      'A safety backup of the current state will be taken first. Continue?';
    if (!confirm(warn)) return;
    setRestoringId(b.id);
    toast.info('Restoring…', { description: 'Taking a safety backup, then applying the restore.' });
    try {
      const fd = new FormData();
      fd.set('mode', 'existing');
      fd.set('confirm', 'RESTORE');
      fd.set('backupId', b.id);
      const res = await fetch('/api/admin/backup/restore', { method: 'POST', body: fd });
      const data = await res.json();
      await onRestoreDone(data, res.ok && data.ok);
    } catch {
      toast.error('Network error');
    } finally {
      setRestoringId(null);
    }
  };

  const handleBackupNow = async () => {
    setRunning(true);
    toast.info('Backup started', { description: 'Creating a database snapshot…' });
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error('Backup failed', { description: data.error ?? 'Unknown error' });
      } else {
        toast.success('Backup created', { description: data.filename });
        await refresh();
        router.refresh();
      }
    } catch {
      toast.error('Network error');
    } finally {
      setRunning(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_schedule',
          enabled: schedule.enabled,
          frequency: schedule.frequency,
          hour: schedule.hour,
          retention: schedule.retention,
          emailEnabled: schedule.emailEnabled,
          emailTo: schedule.emailTo.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error('Failed to save schedule', { description: data.error });
      } else {
        setSchedule((prev) => ({ ...prev, nextRunAt: data.nextRunAt }));
        toast.success(
          schedule.enabled
            ? 'Automatic backups enabled'
            : 'Schedule saved — automatic backups are off',
        );
        router.refresh();
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this backup? The file will be permanently removed.')) return;
    try {
      const res = await fetch(`/api/admin/backup/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error('Failed to delete', { description: data.error });
        return;
      }
      setBackups((prev) => prev.filter((b) => b.id !== id));
      toast.success('Backup deleted');
    } catch {
      toast.error('Network error');
    }
  };

  const handleEmail = async (id: string) => {
    if (!smtp.enabled) {
      toast.error('SMTP is not enabled', {
        description: 'Configure it in Email / SMTP settings first.',
      });
      return;
    }
    setEmailingId(id);
    toast.info('Sending backup…', { description: 'Attaching the file and sending via SMTP.' });
    try {
      const res = await fetch(`/api/admin/backup/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'email' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error('Failed to email backup', { description: data.error });
      } else {
        toast.success('Backup emailed', {
          description: schedule.emailTo || smtp.fromAddress || 'recipient',
        });
        await refresh();
      }
    } catch {
      toast.error('Network error');
    } finally {
      setEmailingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Backup now */}
      <section className="rounded-2xl border border-line bg-paper-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-paper">
              <Database size={22} weight="fill" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">
                Backup now
              </h3>
              <p className="mt-1 max-w-xl text-sm text-ink-muted">
                Create an immediate snapshot of the entire database. The file is compressed
                (.sql.gz) and can be downloaded or restored later.
              </p>
            </div>
          </div>
          <Button type="button" onClick={handleBackupNow} disabled={running}>
            {running ? 'Backing up…' : 'Create backup'}
          </Button>
        </div>
      </section>

      {/* Schedule */}
      <section className="rounded-2xl border border-line bg-paper-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
              Automatic backups
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Schedule backups to run automatically. Older backups beyond the retention limit are
              pruned.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={schedule.enabled}
            onClick={() => setSchedule((p) => ({ ...p, enabled: !p.enabled }))}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              schedule.enabled ? 'bg-primary-500' : 'bg-line'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                schedule.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div
          className={`mt-5 grid gap-3 transition-opacity sm:grid-cols-3 ${
            schedule.enabled ? 'opacity-100' : 'pointer-events-none opacity-50'
          }`}
        >
          {FREQUENCIES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSchedule((p) => ({ ...p, frequency: f.id }))}
              className={`rounded-xl border p-4 text-left transition ${
                schedule.frequency === f.id
                  ? 'border-ink ring-2 ring-ink/10'
                  : 'border-line hover:border-ink/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{f.label}</span>
                {schedule.frequency === f.id && (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-paper">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-ink-muted">{f.desc}</p>
            </button>
          ))}
        </div>

        <div
          className={`mt-4 grid gap-4 transition-opacity sm:grid-cols-2 ${
            schedule.enabled ? 'opacity-100' : 'pointer-events-none opacity-50'
          }`}
        >
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Run at hour (server time)
            </label>
            <select
              value={schedule.hour}
              onChange={(e) => setSchedule((p) => ({ ...p, hour: Number(e.target.value) }))}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm text-ink"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Keep last N backups
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={schedule.retention}
              onChange={(e) =>
                setSchedule((p) => ({ ...p, retention: Math.max(1, Number(e.target.value) || 1) }))
              }
              className="mt-1.5 w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm text-ink"
            />
          </div>
        </div>

        {/* Email delivery */}
        <div
          className={`mt-4 rounded-xl border border-line bg-paper p-4 transition-opacity ${
            schedule.enabled ? 'opacity-100' : 'pointer-events-none opacity-50'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-ink">Email each backup</h4>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                Attach the backup file and send it via SMTP after every scheduled run.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={schedule.emailEnabled}
              onClick={() => setSchedule((p) => ({ ...p, emailEnabled: !p.emailEnabled }))}
              disabled={!smtp.enabled}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                schedule.emailEnabled ? 'bg-primary-500' : 'bg-line'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  schedule.emailEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {!smtp.enabled && (
            <p className="mt-2 text-[12px] font-medium text-amber-700">
              SMTP is not enabled. Configure it in{' '}
              <a href="/admin/email" className="underline">
                Email / SMTP settings
              </a>{' '}
              to email backups.
            </p>
          )}
          {smtp.enabled && (
            <div className="mt-3">
              <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Recipient email
              </label>
              <input
                type="email"
                value={schedule.emailTo}
                onChange={(e) => setSchedule((p) => ({ ...p, emailTo: e.target.value }))}
                placeholder={smtp.fromAddress ?? 'admin@example.com'}
                className="mt-1.5 w-full max-w-sm rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm text-ink"
              />
              <p className="mt-1 font-serif text-xs italic text-ink-muted">
                Leave empty to send to the SMTP from-address
                {smtp.fromAddress ? ` (${smtp.fromAddress})` : ''}.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="font-mono text-[11px] text-ink-muted">
            {schedule.enabled && schedule.nextRunAt ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} /> Next run: {formatDateTime(schedule.nextRunAt)}
              </span>
            ) : (
              <span>Automatic backups are off.</span>
            )}
            {schedule.lastRunAt && (
              <span className="ml-3">· Last: {formatDateTime(schedule.lastRunAt)}</span>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleSaveSchedule} disabled={saving}>
            {saving ? 'Saving…' : 'Save schedule'}
          </Button>
        </div>
      </section>

      {/* Restore / Import */}
      <section className="rounded-2xl border border-amber-300 bg-amber-50/60 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-ink">
            <ArrowCounterClockwise size={22} weight="fill" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">
              Restore / rollback
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              Restore the database from a backup file (<code>.sql.gz</code>) you previously
              downloaded or received by email — or use one of the stored backups in the history
              below.
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-100/70 px-3 py-2 text-[12px] text-amber-900">
              <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
              <span>
                <strong>This overwrites the entire current database.</strong> A safety backup of the
                current state is taken automatically before any restore, so you can roll back a
                mistake.
              </span>
            </div>

            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".gz,.sql.gz,application/gzip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleRestoreUpload(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring || restoringId !== null}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UploadSimple size={16} weight="bold" />
                {restoring ? 'Restoring…' : 'Upload .sql.gz & restore'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* History */}
      <section>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
            Backup history
          </h3>
          <button
            type="button"
            onClick={() => void refresh()}
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary-700 hover:underline"
          >
            Refresh
          </button>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-paper-50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-ink-muted">
                    No backups yet. Create your first backup above.
                  </td>
                </tr>
              ) : (
                pageRows.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-ink-muted">
                      {formatDateTime(b.startedAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex rounded-full bg-paper-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                        {b.trigger}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink">
                      {b.status === 'success' ? formatBytes(b.sizeBytes) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={b.status} error={b.error} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        {b.status === 'success' && (
                          <>
                            <a
                              href={`/api/admin/backup/${b.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink hover:border-ink"
                            >
                              <DownloadSimple size={13} weight="bold" /> Download
                            </a>
                            <button
                              type="button"
                              onClick={() => void handleEmail(b.id)}
                              disabled={emailingId === b.id || !smtp.enabled}
                              title={smtp.enabled ? 'Email this backup' : 'Enable SMTP to email backups'}
                              className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <PaperPlaneTilt size={13} weight="bold" />
                              {emailingId === b.id ? 'Sending…' : 'Email'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRestoreExisting(b)}
                              disabled={restoringId === b.id || restoring}
                              title="Restore the database from this backup (overwrites current data)"
                              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowCounterClockwise size={13} weight="bold" />
                              {restoringId === b.id ? 'Restoring…' : 'Restore'}
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDelete(b.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Trash size={13} weight="bold" /> Delete
                        </button>
                      </div>
                      {b.status === 'success' && (b.emailedAt || b.emailError) && (
                        <div className="mt-1 text-right text-[10px]">
                          {b.emailedAt ? (
                            <span className="text-emerald-700">
                              ✓ Emailed {formatDateTime(b.emailedAt)}
                            </span>
                          ) : (
                            <span className="text-red-600" title={b.emailError ?? ''}>
                              Email failed
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentPage}
          pageCount={pageCount}
          totalItems={backups.length}
          onPageChange={setPage}
        />
        <p className="mt-3 font-serif text-xs italic text-ink-muted">
          Backups are stored on the server under the configured backup directory. Download important
          snapshots to off-site storage for disaster recovery.
        </p>
      </section>
    </div>
  );
}

function StatusBadge({ status, error }: { status: string; error: string | null }) {
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
        <CheckCircle size={12} weight="fill" /> Success
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span
        title={error ?? ''}
        className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800"
      >
        <XCircle size={12} weight="fill" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
      <HourglassMedium size={12} weight="fill" /> Pending
    </span>
  );
}
