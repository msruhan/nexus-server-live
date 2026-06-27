'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { IS_DEMO_MODE } from '@/lib/demo-mode-client';

type SyncSettings = {
  syncScheduleEnabled: boolean;
  syncIntervalHours: number;
  syncImeiServices: boolean;
  syncServerServices: boolean;
  priceChangePolicy: 'AUTO_FIXED_MARGIN' | 'REQUIRE_RECONNECT';
  defaultFixedMargin: number | null;
  autoDisableRemoved: boolean;
  autoDisableHighReject: boolean;
  rejectRateThreshold: number | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  syncRequiresReconnect: boolean;
  cachedBalance: number | null;
  cachedBalanceAt: string | null;
};

type SyncLog = {
  id: string;
  trigger: string;
  status: string;
  summary: string | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
};

export function ProviderSyncSettings({ providerId }: { providerId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [settings, setSettings] = React.useState<SyncSettings | null>(null);
  const [logs, setLogs] = React.useState<SyncLog[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [sRes, lRes] = await Promise.all([
      fetch(`/api/admin/imei/apis/${providerId}/sync-settings`),
      fetch(`/api/admin/imei/apis/${providerId}/sync-logs?limit=10`),
    ]);
    const sJson = await sRes.json().catch(() => ({}));
    const lJson = await lRes.json().catch(() => ({}));
    if (sRes.ok && sJson.success) {
      setSettings({
        ...sJson.data,
        defaultFixedMargin:
          sJson.data.defaultFixedMargin != null ? Number(sJson.data.defaultFixedMargin) : null,
        rejectRateThreshold:
          sJson.data.rejectRateThreshold != null ? Number(sJson.data.rejectRateThreshold) : null,
        cachedBalance:
          sJson.data.cachedBalance != null ? Number(sJson.data.cachedBalance) : null,
      });
    }
    if (lRes.ok && lJson.success) setLogs(lJson.data.logs ?? []);
    setLoading(false);
  }, [providerId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!settings || IS_DEMO_MODE) return;
    setSaving(true);
    const res = await fetch(`/api/admin/imei/apis/${providerId}/sync-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok || !json.success) {
      toast.error('Save failed', { description: json.error ?? 'Unknown error' });
      return;
    }
    toast.success('Sync settings saved');
    void load();
  }

  async function runSyncNow() {
    if (IS_DEMO_MODE) return;
    setRunning(true);
    const res = await fetch(`/api/admin/imei/apis/${providerId}/sync-settings`, {
      method: 'POST',
    });
    const json = await res.json().catch(() => ({}));
    setRunning(false);
    if (!res.ok || !json.success) {
      toast.error('Sync failed', { description: json.error ?? 'Unknown error' });
      return;
    }
    toast.success('Catalog sync complete', { description: json.data?.summary });
    void load();
  }

  async function acknowledgeReconnect() {
    if (IS_DEMO_MODE) return;
    const res = await fetch(
      `/api/admin/imei/apis/${providerId}/sync-settings?action=acknowledge-reconnect`,
      { method: 'POST' },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to acknowledge');
      return;
    }
    toast.success('Reconnect acknowledged — sync re-enabled');
    void load();
  }

  if (loading || !settings) {
    return <div className="text-sm text-ink-muted">Loading sync settings…</div>;
  }

  return (
    <div className="space-y-6">
      {settings.syncRequiresReconnect && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Supplier prices changed. Review catalog and reconnect sync.
          <button
            type="button"
            onClick={() => void acknowledgeReconnect()}
            className="ml-3 font-semibold underline"
          >
            Acknowledge & continue
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.syncScheduleEnabled}
            onChange={(e) =>
              setSettings((s) => s && { ...s, syncScheduleEnabled: e.target.checked })
            }
          />
          Scheduled sync enabled
        </label>
        <label className="text-sm">
          Interval (hours)
          <input
            type="number"
            min={1}
            max={168}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2"
            value={settings.syncIntervalHours}
            onChange={(e) =>
              setSettings((s) =>
                s ? { ...s, syncIntervalHours: Number(e.target.value) || 24 } : s,
              )
            }
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.syncImeiServices}
            onChange={(e) =>
              setSettings((s) => s && { ...s, syncImeiServices: e.target.checked })
            }
          />
          Sync IMEI catalog
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.syncServerServices}
            onChange={(e) =>
              setSettings((s) => s && { ...s, syncServerServices: e.target.checked })
            }
          />
          Sync server catalog
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Price change policy
          <select
            className="mt-1 w-full rounded-lg border border-line px-3 py-2"
            value={settings.priceChangePolicy}
            onChange={(e) =>
              setSettings((s) =>
                s
                  ? {
                      ...s,
                      priceChangePolicy: e.target.value as SyncSettings['priceChangePolicy'],
                    }
                  : s,
              )
            }
          >
            <option value="AUTO_FIXED_MARGIN">Auto adjust retail (keep margin)</option>
            <option value="REQUIRE_RECONNECT">Require reconnect on price change</option>
          </select>
        </label>
        <label className="text-sm">
          Default fixed margin ($)
          <input
            type="number"
            min={0}
            step="0.01"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2"
            value={settings.defaultFixedMargin ?? ''}
            onChange={(e) =>
              setSettings((s) =>
                s
                  ? {
                      ...s,
                      defaultFixedMargin: e.target.value === '' ? null : Number(e.target.value),
                    }
                  : s,
              )
            }
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoDisableRemoved}
            onChange={(e) =>
              setSettings((s) => s && { ...s, autoDisableRemoved: e.target.checked })
            }
          />
          Auto-disable missing from supplier
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoDisableHighReject}
            onChange={(e) =>
              setSettings((s) => s && { ...s, autoDisableHighReject: e.target.checked })
            }
          />
          Auto-disable high reject rate
        </label>
        <label className="text-sm sm:col-span-2">
          Reject rate threshold (%)
          <input
            type="number"
            min={0}
            max={100}
            className="mt-1 w-full max-w-xs rounded-lg border border-line px-3 py-2"
            value={settings.rejectRateThreshold ?? ''}
            onChange={(e) =>
              setSettings((s) =>
                s
                  ? {
                      ...s,
                      rejectRateThreshold: e.target.value === '' ? null : Number(e.target.value),
                    }
                  : s,
              )
            }
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
        {settings.lastSyncAt && (
          <span>Last sync: {new Date(settings.lastSyncAt).toLocaleString()}</span>
        )}
        {settings.cachedBalance != null && (
          <span>
            Balance: ${settings.cachedBalance.toFixed(2)}
            {settings.cachedBalanceAt &&
              ` · ${new Date(settings.cachedBalanceAt).toLocaleString()}`}
          </span>
        )}
        {settings.lastSyncError && (
          <span className="text-red-600">Error: {settings.lastSyncError}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save sync settings'}
        </Button>
        <Button type="button" variant="outline" onClick={() => void runSyncNow()} disabled={running}>
          {running ? 'Syncing…' : 'Run sync now'}
        </Button>
      </div>

      {logs.length > 0 && (
        <div className="rounded-xl border border-line bg-paper-50 p-4">
          <h3 className="font-display text-sm font-bold text-ink">Recent sync logs</h3>
          <ul className="mt-3 space-y-2 text-xs">
            {logs.map((log) => (
              <li key={log.id} className="border-b border-line/50 pb-2 last:border-0">
                <span className="font-mono text-ink-muted">
                  {new Date(log.startedAt).toLocaleString()}
                </span>{' '}
                · {log.trigger} ·{' '}
                <span className={log.status === 'success' ? 'text-green-700' : 'text-red-600'}>
                  {log.status}
                </span>
                {log.summary && <div className="mt-0.5 text-ink">{log.summary}</div>}
                {log.error && <div className="text-red-600">{log.error}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
