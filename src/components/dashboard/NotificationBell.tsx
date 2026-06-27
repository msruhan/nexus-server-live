'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/notifications?limit=25');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setItems(json.items ?? []);
        setUnread(json.unread ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function markRead(id: string) {
    await fetch(`/api/user/notifications/${id}/read`, { method: 'POST' });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
  }

  async function markAllRead() {
    await fetch('/api/user/notifications/read-all', { method: 'POST' });
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void load();
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-paper-50 text-ink hover:bg-paper-200"
        aria-label="Notifications"
      >
        <Bell size={18} weight={unread > 0 ? 'fill' : 'regular'} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 font-mono text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-xl border border-line bg-paper shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-display text-sm font-bold text-ink">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="font-mono text-[10px] uppercase tracking-wider text-primary-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center font-serif text-sm italic text-ink-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center font-serif text-sm italic text-ink-muted">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.href ?? '#'}
                  onClick={() => {
                    if (!n.readAt) void markRead(n.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'block border-b border-line px-4 py-3 transition-colors hover:bg-paper-50 last:border-0',
                    !n.readAt && 'bg-primary-50/40',
                  )}
                >
                  <div className="font-display text-sm font-bold text-ink">{n.title}</div>
                  {n.body && (
                    <div className="mt-0.5 line-clamp-2 font-serif text-xs italic text-ink-muted">{n.body}</div>
                  )}
                  <div className="mt-1 font-mono text-[10px] text-ink-soft">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
