'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type EventCatalogItem = { key: string; label: string; description: string };

type Props = {
  initial: {
    telegramBotEnabled: boolean;
    telegramBotToken: string;
    telegramBotUsername: string;
    telegramAdminChatId: string;
    telegramChannelId: string;
    telegramChannelEnabled: boolean;
    hasToken: boolean;
    userEvents: string[];
    adminEvents: string[];
  };
  userEventCatalog: EventCatalogItem[];
  adminEventCatalog: EventCatalogItem[];
  linkedUsersCount: number;
};

export function TelegramSettingsForm({ initial, userEventCatalog, adminEventCatalog, linkedUsersCount }: Props) {
  const [enabled, setEnabled] = React.useState(initial.telegramBotEnabled);
  const [token, setToken] = React.useState(initial.telegramBotToken);
  const [botUsername, setBotUsername] = React.useState(initial.telegramBotUsername);
  const [adminChatId, setAdminChatId] = React.useState(initial.telegramAdminChatId);
  const [channelId, setChannelId] = React.useState(initial.telegramChannelId);
  const [channelEnabled, setChannelEnabled] = React.useState(initial.telegramChannelEnabled);
  const [userEvents, setUserEvents] = React.useState<string[]>(initial.userEvents);
  const [adminEvents, setAdminEvents] = React.useState<string[]>(initial.adminEvents);

  const [saving, setSaving] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [testingAdmin, setTestingAdmin] = React.useState(false);
  const [testingChannel, setTestingChannel] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const toggleUserEvent = (key: string) => {
    setUserEvents((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const toggleAdminEvent = (key: string) => {
    setAdminEvents((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleVerify = async () => {
    if (!token || token.startsWith('••••••')) {
      showMessage('error', 'Please enter a valid bot token');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', token }),
      });
      const data = await res.json();
      if (data.ok) {
        setBotUsername(data.username ?? '');
        showMessage('success', `Bot verified: @${data.username} (${data.firstName})`);
      } else {
        showMessage('error', data.error ?? 'Verification failed');
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          telegramBotEnabled: enabled,
          telegramBotToken: token,
          telegramAdminChatId: adminChatId,
          telegramChannelId: channelId,
          telegramChannelEnabled: channelEnabled,
          telegramUserEvents: userEvents,
          telegramAdminEvents: adminEvents,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.botUsername) setBotUsername(data.botUsername);
        showMessage('success', 'Settings saved successfully');
      } else {
        showMessage('error', data.error ?? 'Save failed');
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAdmin = async () => {
    setTestingAdmin(true);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'testAdmin' }),
      });
      const data = await res.json();
      if (data.ok) {
        showMessage('success', 'Test message sent to admin!');
      } else {
        showMessage('error', data.error ?? 'Send failed');
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setTestingAdmin(false);
    }
  };

  const handleTestChannel = async () => {
    setTestingChannel(true);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'testChannel' }),
      });
      const data = await res.json();
      if (data.ok) {
        showMessage('success', 'Test message sent to channel!');
      } else {
        showMessage('error', data.error ?? 'Send failed');
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setTestingChannel(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Status banner */}
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

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper-50 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Status</div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${enabled && initial.hasToken ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
            <span className="text-sm font-bold text-ink">
              {enabled && initial.hasToken ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {botUsername && (
            <div className="mt-1 font-mono text-xs text-ink-muted">@{botUsername}</div>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-paper-50 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Linked Users</div>
          <div className="mt-1 text-2xl font-extrabold text-ink">{linkedUsersCount}</div>
        </div>
        <div className="rounded-2xl border border-line bg-paper-50 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Channel</div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${channelEnabled && channelId ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
            <span className="text-sm font-bold text-ink">
              {channelEnabled && channelId ? 'Active' : 'Inactive'}
            </span>
          </div>
          {channelId && (
            <div className="mt-1 font-mono text-xs text-ink-muted">{channelId}</div>
          )}
        </div>
      </div>

      {/* Bot Configuration */}
      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
          Bot Configuration
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Create a bot via{' '}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-600 underline"
          >
            @BotFather
          </a>{' '}
          and paste the token here.
        </p>

        <div className="mt-6 space-y-5">
          {/* Enable toggle */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-ink">Enable Telegram Bot</span>
          </label>

          {/* Token */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Bot Token
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="shrink-0 rounded-lg border border-line bg-paper px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-paper-200 disabled:opacity-50"
              >
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </div>

          {/* Bot username (read-only) */}
          {botUsername && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Bot Username
              </label>
              <div className="mt-1.5 rounded-lg border border-line bg-paper-100 px-3 py-2 text-sm text-ink">
                @{botUsername}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Admin Notifications */}
      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
          Admin Notifications
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Receive notifications for new orders, top-ups, and tickets directly in Telegram.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Admin Chat ID
            </label>
            <input
              type="text"
              value={adminChatId}
              onChange={(e) => setAdminChatId(e.target.value)}
              placeholder="e.g. 123456789"
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            <p className="mt-1 text-xs text-ink-muted">
              Send /start to{' '}
              <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="underline">
                @userinfobot
              </a>{' '}
              to get your chat ID.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestAdmin}
            disabled={testingAdmin || !adminChatId}
            className="rounded-lg border border-line bg-paper px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-paper-200 disabled:opacity-50"
          >
            {testingAdmin ? 'Sending…' : 'Send Test Message'}
          </button>

          {/* Admin event checkboxes */}
          <div className="border-t border-line pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Events sent to admin
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdminEvents(adminEventCatalog.map((e) => e.key))}
                  className="text-[11px] font-medium text-primary-600 hover:underline"
                >
                  All
                </button>
                <span className="text-ink-muted">·</span>
                <button
                  type="button"
                  onClick={() => setAdminEvents([])}
                  className="text-[11px] font-medium text-ink-muted hover:underline"
                >
                  None
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              {adminEventCatalog.map((evt) => (
                <label key={evt.key} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={adminEvents.includes(evt.key)}
                    onChange={() => toggleAdminEvent(evt.key)}
                    className="mt-0.5 h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500"
                  />
                  <span className="leading-tight">
                    <span className="block text-sm font-medium text-ink">{evt.label}</span>
                    <span className="block text-xs text-ink-muted">{evt.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* User Notifications */}
      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
          User Notifications
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Choose which events are sent to users who have linked their Telegram account. Users can
          still opt out individually from their own settings.
        </p>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Events sent to users
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUserEvents(userEventCatalog.map((e) => e.key))}
                className="text-[11px] font-medium text-primary-600 hover:underline"
              >
                All
              </button>
              <span className="text-ink-muted">·</span>
              <button
                type="button"
                onClick={() => setUserEvents([])}
                className="text-[11px] font-medium text-ink-muted hover:underline"
              >
                None
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-2.5">
            {userEventCatalog.map((evt) => (
              <label key={evt.key} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={userEvents.includes(evt.key)}
                  onChange={() => toggleUserEvent(evt.key)}
                  className="mt-0.5 h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500"
                />
                <span className="leading-tight">
                  <span className="block text-sm font-medium text-ink">{evt.label}</span>
                  <span className="block text-xs text-ink-muted">{evt.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Channel Configuration */}
      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
          Channel Auto-Post
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Automatically post to a Telegram channel when new services are published or prices change.
          Make sure the bot is added as an admin to the channel.
        </p>

        <div className="mt-6 space-y-5">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={channelEnabled}
              onChange={(e) => setChannelEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-ink">Enable channel auto-post</span>
          </label>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Channel ID
            </label>
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="e.g. @mychannel or -1001234567890"
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            <p className="mt-1 text-xs text-ink-muted">
              Use @channelname for public channels or the numeric ID for private channels.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestChannel}
            disabled={testingChannel || !channelId}
            className="rounded-lg border border-line bg-paper px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-paper-200 disabled:opacity-50"
          >
            {testingChannel ? 'Sending…' : 'Send Test Message'}
          </button>
        </div>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-ink px-6 py-3 text-sm font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
