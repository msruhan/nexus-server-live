'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  initial: {
    discordWebhookEnabled: boolean;
    discordWebhookUrl: string;
    discordBotUsername: string;
    discordBotAvatarUrl: string;
  };
};

export function DiscordSettingsForm({ initial }: Props) {
  const [enabled, setEnabled] = React.useState(initial.discordWebhookEnabled);
  const [webhookUrl, setWebhookUrl] = React.useState(initial.discordWebhookUrl);
  const [botUsername, setBotUsername] = React.useState(initial.discordBotUsername);
  const [avatarUrl, setAvatarUrl] = React.useState(initial.discordBotAvatarUrl);
  const [clearAvatar, setClearAvatar] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'discord-avatar');
      const res = await fetch('/api/admin/branding/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showMessage('error', data.error ?? 'Avatar upload failed');
        return;
      }
      setAvatarUrl(data.url);
      setClearAvatar(false);
      showMessage('success', 'Bot avatar uploaded');
    } catch {
      showMessage('error', 'Avatar upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = () => {
    setAvatarUrl('');
    setClearAvatar(true);
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
          discordBotUsername: botUsername,
          clearDiscordBotAvatar: clearAvatar,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setClearAvatar(false);
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
              Bot username {enabled ? <span className="text-red-500">*</span> : null}
            </label>
            <input
              type="text"
              value={botUsername}
              onChange={(e) => setBotUsername(e.target.value)}
              maxLength={80}
              placeholder="e.g. Nexus Unlock Bot"
              required={enabled}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            <p className="mt-1 text-xs text-ink-muted">
              Display name shown on Discord messages. Required when webhook is enabled.
            </p>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-paper">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Bot avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="font-mono text-[9px] uppercase text-ink-soft">No avatar</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-ink">Bot profile photo</div>
              <div className="text-xs text-ink-muted">
                PNG / JPG / WebP. Square image recommended. Optional.
              </div>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink">
                {uploadingAvatar ? 'Uploading…' : 'Upload avatar'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                    e.target.value = '';
                  }}
                />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="ml-2 text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Webhook URL {enabled ? <span className="text-red-500">*</span> : null}
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
