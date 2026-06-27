'use client';

import * as React from 'react';
import {
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/client';
import { iosPushRequiresInstall, isStandalonePwa } from '@/lib/push/platform';
import { IosInstallSteps } from '@/components/pwa/IosInstallSteps';

export function PushNotificationForm() {
  const [status, setStatus] = React.useState<{
    configured: boolean;
    notifyEnabled: boolean;
    subscribed: boolean;
  } | null>(null);
  const [needsIosInstall, setNeedsIosInstall] = React.useState(false);
  const [isInstalledPwa, setIsInstalledPwa] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/user/push');
      const data = await res.json();
      setStatus({
        configured: data.configured ?? false,
        notifyEnabled: data.notifyEnabled ?? true,
        subscribed: data.subscribed ?? false,
      });
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void registerServiceWorker();
    setNeedsIosInstall(iosPushRequiresInstall());
    setIsInstalledPwa(isStandalonePwa());
    void fetchStatus();
  }, [fetchStatus]);

  async function handleEnablePush() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await subscribeToPush();
      if (result.ok) {
        setMessage({ type: 'success', text: 'Push notifications enabled on this device' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Could not enable push' });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDisablePush() {
    setBusy(true);
    setMessage(null);
    try {
      await unsubscribeFromPush();
      setMessage({ type: 'success', text: 'Push disabled on this device' });
      await fetchStatus();
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleNotify(enabled: boolean) {
    await fetch('/api/user/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleNotify', enabled }),
    });
    setStatus((prev) => (prev ? { ...prev, notifyEnabled: enabled } : prev));
  }

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-line bg-paper-50 p-6">
        <div className="h-4 w-40 rounded bg-paper-200" />
        <div className="mt-3 h-3 w-56 rounded bg-paper-200" />
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="rounded-xl border border-line bg-paper-50 p-6">
        <p className="text-sm text-ink-muted">
          Browser push is not configured on this server yet. Contact the administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {needsIosInstall && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
          <div className="text-sm font-bold text-amber-950">Install app first (iOS)</div>
          <p className="mt-1 text-xs text-amber-900">
            Push notifications on iPhone/iPad only work when Recovero is opened from your Home
            Screen — not from a Safari tab.
          </p>
          <IosInstallSteps />
        </div>
      )}

      {isInstalledPwa && !needsIosInstall && (
        <p className="text-[11px] text-emerald-700">
          Running as an installed app — push is supported on this device.
        </p>
      )}

      <div className="rounded-xl border border-line bg-paper-50 p-5">
        <div className="text-sm font-bold text-ink">Browser push notifications</div>
        <p className="mt-1 text-xs text-ink-muted">
          Get order status updates even when the app is closed (requires permission on this
          device).
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={status.notifyEnabled}
              onChange={(e) => void handleToggleNotify(e.target.checked)}
              className="h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-ink">Receive push notifications</span>
          </label>

          {status.subscribed ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                Active on this device
              </span>
              <button
                type="button"
                onClick={() => void handleDisablePush()}
                disabled={busy}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-paper-200 disabled:opacity-50"
              >
                Remove from this device
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleEnablePush()}
              disabled={busy || !status.notifyEnabled || needsIosInstall}
              className="rounded-lg bg-ink px-4 py-2 text-xs font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Enabling…' : 'Enable on this device'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
