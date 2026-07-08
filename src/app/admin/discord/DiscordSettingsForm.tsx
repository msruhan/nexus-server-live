'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  initial: {
    discordWebhookEnabled: boolean;
    discordWebhookUrl: string;
  };
};

export function DiscordSettingsForm({ initial }: Props) {
  const [enabled, setEnabled] = React.useState(initial.discordWebhookEnabled);
  const [webhookUrl, setWebhookUrl] = React.useState(initial.discordWebhookUrl);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          discordWebhookEnabled: enabled,
          discordWebhookUrl: webhookUrl,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showMessage('success', 'Discord webhook settings saved');
      } else {
        showMessage('error', data.error ?? 'Save failed');
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/admin/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const data = await res.json();
      if (data.ok) {
        showMessage('success', 'Test message sent to Discord channel');
      } else {
        showMessage('error', data.error ?? 'Send failed');
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
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

      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
          Discord Webhook
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Enter your Discord webhook URL from the channel integration settings.
        </p>

        <div className="mt-6 space-y-5">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-ink">Enable Discord auto-post</span>
          </label>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Webhook URL
            </label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            <p className="mt-1 text-xs text-ink-muted">
              New service and price update notifications are sent to this webhook.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={test}
              disabled={testing}
              className="rounded-lg border border-line bg-paper px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-paper-200 disabled:opacity-50"
            >
              {testing ? 'Sending…' : 'Send Test Message'}
            </button>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-ink px-6 py-3 text-sm font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
