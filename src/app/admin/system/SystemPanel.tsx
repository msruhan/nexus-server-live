'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type LicenseData = {
  status: 'active' | 'inactive' | 'not_activated';
  key: string | null;
  domain: string | null;
  plan: string | null;
  expiresAt: string | null;
  lastValidatedAt: string | null;
  reason: string | null;
};

type UpdateHistoryEntry = {
  id: string;
  fromVersion: string;
  toVersion: string;
  status: string;
  error: string | null;
  appliedAt: string;
  durationSeconds: number | null;
};

type Props = {
  initial: {
    currentVersion: string;
    license: LicenseData;
    lastUpdate: { version: string | null; at: string | null };
    updateHistory: UpdateHistoryEntry[];
  };
};

export function SystemPanel({ initial }: Props) {
  const [license, setLicense] = React.useState(initial.license);
  const [licenseKey, setLicenseKey] = React.useState('');
  const [activating, setActivating] = React.useState(false);
  const [revalidating, setRevalidating] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [updateInfo, setUpdateInfo] = React.useState<{
    available: boolean;
    latestVersion: string | null;
    changelog: string | null;
    downloadUrl: string | null;
    checksum: string | null;
  } | null>(null);

  const [progress, setProgress] = React.useState<{
    phase: string;
    percent: number;
    message: string;
    error?: string;
  } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  };

  // Poll progress while updating
  React.useEffect(() => {
    if (!updating) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/system/update-progress');
        const data = await res.json();
        setProgress(data);
        if (data.phase === 'done' || data.phase === 'failed') {
          setUpdating(false);
          if (data.phase === 'done') showMessage('success', data.message);
          if (data.phase === 'failed') showMessage('error', data.error ?? 'Update failed');
        }
      } catch { /* silent */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [updating]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setActivating(true);
    try {
      const res = await fetch('/api/admin/system/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', key: licenseKey.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setLicense(data.info);
        setLicenseKey('');
        showMessage('success', 'License activated successfully!');
      } else {
        showMessage('error', data.error ?? 'Activation failed');
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setActivating(false);
    }
  };

  const handleRevalidate = async () => {
    setRevalidating(true);
    try {
      const res = await fetch('/api/admin/system/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate' }),
      });
      const data = await res.json();
      if (data.ok) {
        setLicense(data.info);
        showMessage('success', 'License is valid and active.');
      } else {
        // Validation failed → license is now inactive locally. Reflect it.
        setLicense((prev) => ({ ...prev, status: 'inactive', reason: data.error ?? 'validation_failed' }));
        showMessage('error', `License is no longer valid: ${data.error ?? 'unknown reason'}`);
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setRevalidating(false);
    }
  };

  const handleCheckUpdate = async () => {
    setChecking(true);
    setUpdateInfo(null);
    try {
      const res = await fetch('/api/admin/system/update-check', { method: 'POST' });
      const data = await res.json();
      if (data.ok !== undefined && !data.ok) {
        showMessage('error', data.error ?? 'Check failed');
      } else if (data.error) {
        showMessage('error', data.error);
      } else {
        setUpdateInfo({
          available: data.available,
          latestVersion: data.latestVersion,
          changelog: data.changelog,
          downloadUrl: data.downloadUrl,
          checksum: data.checksum,
        });
        if (!data.available) showMessage('success', 'Your system is up to date!');
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setChecking(false);
    }
  };

  const handleApplyUpdate = async () => {
    if (!updateInfo?.downloadUrl || !updateInfo.latestVersion) return;
    setUpdating(true);
    setProgress({ phase: 'downloading', percent: 5, message: 'Starting update...' });
    try {
      const res = await fetch('/api/admin/system/update-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetVersion: updateInfo.latestVersion,
          downloadUrl: updateInfo.downloadUrl,
          checksum: updateInfo.checksum,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setUpdating(false);
        showMessage('error', data.error ?? 'Failed to start update');
      }
    } catch {
      setUpdating(false);
      showMessage('error', 'Network error');
    }
  };

  const statusColor = license.status === 'active' ? 'emerald' : license.status === 'inactive' ? 'red' : 'zinc';

  return (
    <div className="space-y-8">
      {/* Message banner */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Info Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-paper-50 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Version</div>
          <div className="mt-1 text-lg font-extrabold text-ink">v{initial.currentVersion}</div>
        </div>
        <div className="rounded-2xl border border-line bg-paper-50 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">License</div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full bg-${statusColor}-500`} />
            <span className="text-sm font-bold capitalize text-ink">{license.status.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-paper-50 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Plan</div>
          <div className="mt-1 text-sm font-bold capitalize text-ink">{license.plan ?? '—'}</div>
        </div>
        <div className="rounded-2xl border border-line bg-paper-50 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Last Update</div>
          <div className="mt-1 text-sm font-bold text-ink">
            {initial.lastUpdate.version ? `v${initial.lastUpdate.version}` : 'Never'}
          </div>
          {initial.lastUpdate.at && (
            <div className="mt-0.5 font-mono text-[10px] text-ink-muted">
              {new Date(initial.lastUpdate.at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* License Section */}
      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">License</h2>

        {license.status === 'not_activated' ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-ink-muted">
              Licensed installs activate automatically during setup. Enter your key here only if activation did not
              complete — each key works once; contact your vendor for a replacement if needed.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="NXS-PRO-2026-XXXX-XXXX-XXXX"
                maxLength={128}
                className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
              <button
                onClick={handleActivate}
                disabled={activating || !licenseKey.trim()}
                className="shrink-0 rounded-lg bg-ink px-5 py-2 text-xs font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {activating ? 'Activating…' : 'Activate'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-ink-muted">Key:</span>{' '}
                <span className="font-mono font-medium">{license.key}</span>
              </div>
              <div>
                <span className="text-ink-muted">Domain:</span>{' '}
                <span className="font-medium">{license.domain ?? '—'}</span>
              </div>
              {license.expiresAt && (
                <div>
                  <span className="text-ink-muted">Expires:</span>{' '}
                  <span className="font-medium">{new Date(license.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
              {license.lastValidatedAt && (
                <div>
                  <span className="text-ink-muted">Last validated:</span>{' '}
                  <span className="font-mono text-xs">{new Date(license.lastValidatedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
            {license.reason && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                Reason: {license.reason}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRevalidate}
                disabled={revalidating}
                className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-200 disabled:opacity-50"
              >
                {revalidating ? 'Re-checking…' : 'Re-check with vendor'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Update Section */}
      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">Updates</h2>

        {license.status !== 'active' ? (
          <p className="mt-3 text-sm text-ink-muted">
            A valid license is required to check for and apply updates. Please activate your license above.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <button
              onClick={handleCheckUpdate}
              disabled={checking || updating}
              className="rounded-lg border border-line bg-paper px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-paper-200 disabled:opacity-50"
            >
              {checking ? 'Checking…' : 'Check for Updates'}
            </button>

            {/* Update available card */}
            {updateInfo?.available && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-primary-200 bg-primary-50/50 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-ink">
                      Update available: v{updateInfo.latestVersion}
                    </div>
                    {updateInfo.changelog && (
                      <p className="mt-1 text-xs text-ink-muted line-clamp-3">{updateInfo.changelog}</p>
                    )}
                  </div>
                  <button
                    onClick={handleApplyUpdate}
                    disabled={updating}
                    className="shrink-0 rounded-lg bg-ink px-5 py-2.5 text-xs font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {updating ? 'Updating…' : 'Update Now'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Progress bar */}
            {updating && progress && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-line bg-paper p-5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{progress.message}</span>
                  <span className="font-mono text-ink-muted">{progress.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-200">
                  <motion.div
                    className="h-full rounded-full bg-primary-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                {progress.error && (
                  <p className="mt-2 text-xs text-red-600">{progress.error}</p>
                )}
              </motion.div>
            )}
          </div>
        )}
      </section>

      {/* Update History */}
      <section>
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">Update History</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-paper-50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {initial.updateHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-ink-muted">
                    No update history yet.
                  </td>
                </tr>
              ) : (
                initial.updateHistory.map((entry) => (
                  <tr key={entry.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 font-mono text-[11px] text-ink-muted">
                      {new Date(entry.appliedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">v{entry.fromVersion}</td>
                    <td className="px-3 py-2 font-mono text-xs font-bold">v{entry.toVersion}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          entry.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                        title={entry.error ?? ''}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-ink-muted">
                      {entry.durationSeconds ? `${entry.durationSeconds}s` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
