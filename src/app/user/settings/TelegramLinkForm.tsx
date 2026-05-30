'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function TelegramLinkForm() {
  const [status, setStatus] = React.useState<{
    botEnabled: boolean;
    botUsername: string;
    isLinked: boolean;
    telegramUsername: string | null;
    linkedAt: string | null;
    notifyEnabled: boolean;
    pendingCode: string | null;
    pendingCodeExpiresAt: string | null;
  } | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [unlinking, setUnlinking] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/user/telegram');
      const data = await res.json();
      setStatus(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
    // Poll every 5s while there's a pending code (waiting for user to link)
    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/user/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateCode' }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus((prev) =>
          prev
            ? { ...prev, pendingCode: data.code, pendingCodeExpiresAt: data.expiresAt }
            : prev,
        );
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to generate code' });
    } finally {
      setGenerating(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink your Telegram account?')) return;
    setUnlinking(true);
    try {
      const res = await fetch('/api/user/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink' }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus((prev) =>
          prev
            ? { ...prev, isLinked: false, telegramUsername: null, linkedAt: null, pendingCode: null }
            : prev,
        );
        setMessage({ type: 'success', text: 'Telegram unlinked successfully' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to unlink' });
    } finally {
      setUnlinking(false);
    }
  };

  const handleToggleNotify = async (enabled: boolean) => {
    try {
      await fetch('/api/user/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleNotify', enabled }),
      });
      setStatus((prev) => (prev ? { ...prev, notifyEnabled: enabled } : prev));
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-line bg-paper-50 p-6">
        <div className="h-4 w-32 rounded bg-paper-200" />
        <div className="mt-3 h-3 w-48 rounded bg-paper-200" />
      </div>
    );
  }

  if (!status?.botEnabled) {
    return (
      <div className="rounded-xl border border-line bg-paper-50 p-6">
        <p className="text-sm text-ink-muted">
          Telegram bot is not configured yet. Please contact the administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {status.isLinked ? (
        /* ─── Linked state ─────────────────────────────────────── */
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg">
              ✓
            </span>
            <div>
              <div className="text-sm font-bold text-emerald-900">
                Linked{status.telegramUsername ? `: @${status.telegramUsername}` : ''}
              </div>
              {status.linkedAt && (
                <div className="text-xs text-emerald-700">
                  Since {new Date(status.linkedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={status.notifyEnabled}
                onChange={(e) => handleToggleNotify(e.target.checked)}
                className="h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-ink">Receive notifications via Telegram</span>
            </label>

            <button
              type="button"
              onClick={handleUnlink}
              disabled={unlinking}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {unlinking ? 'Unlinking…' : 'Unlink Telegram'}
            </button>
          </div>
        </div>
      ) : status.pendingCode ? (
        /* ─── Pending link code ────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-amber-200 bg-amber-50/50 p-5"
        >
          <div className="text-sm font-bold text-amber-900">Link your Telegram</div>
          <p className="mt-1 text-xs text-amber-800">
            Send the following message to{' '}
            <a
              href={`https://t.me/${status.botUsername}?start=${status.pendingCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline"
            >
              @{status.botUsername}
            </a>
            :
          </p>
          <div className="mt-3 rounded-lg border border-amber-300 bg-white px-4 py-3 font-mono text-sm font-bold text-ink">
            /start {status.pendingCode}
          </div>
          <p className="mt-2 text-[11px] text-amber-700">
            Or click the bot link above — it will auto-fill the command.
            Code expires in 10 minutes.
          </p>
          <button
            type="button"
            onClick={handleGenerateCode}
            disabled={generating}
            className="mt-3 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-200 disabled:opacity-50"
          >
            Generate new code
          </button>
        </motion.div>
      ) : (
        /* ─── Not linked ───────────────────────────────────────── */
        <div className="rounded-xl border border-line bg-paper-50 p-5">
          <div className="text-sm font-bold text-ink">Connect your Telegram</div>
          <p className="mt-1 text-xs text-ink-muted">
            Link your Telegram account to receive order updates, payment notifications, and more
            directly in Telegram.
          </p>
          <button
            type="button"
            onClick={handleGenerateCode}
            disabled={generating}
            className="mt-4 rounded-lg bg-ink px-4 py-2 text-xs font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Link Telegram'}
          </button>
        </div>
      )}
    </div>
  );
}
