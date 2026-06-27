'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';

type Announcement = {
  id: string;
  title: string | null;
  message: string;
  tone: 'info' | 'warning' | 'maintenance';
  linkUrl: string | null;
  linkLabel: string | null;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  showOnAdmin: boolean;
  sortOrder: number;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AnnouncementManager({ initial }: { initial: Announcement[] }) {
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<Announcement | null>(null);

  async function refresh() {
    const res = await fetch('/api/admin/cms/announcements');
    const json = await res.json();
    if (json.ok) setItems(json.items);
  }

  async function save(item: Announcement) {
    const payload = {
      ...item,
      startAt: item.startAt ? new Date(item.startAt).toISOString() : null,
      endAt: item.endAt ? new Date(item.endAt).toISOString() : null,
    };
    const res = await fetch(
      item.id.startsWith('new-') ? '/api/admin/cms/announcements' : `/api/admin/cms/announcements/${item.id}`,
      {
        method: item.id.startsWith('new-') ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      toast.error('Save failed');
      return;
    }
    toast.success('Saved');
    setEditing(null);
    await refresh();
  }

  async function remove(id: string) {
    if (!confirm('Delete this announcement?')) return;
    await fetch(`/api/admin/cms/announcements/${id}`, { method: 'DELETE' });
    toast.success('Deleted');
    await refresh();
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        onClick={() =>
          setEditing({
            id: `new-${Date.now()}`,
            title: '',
            message: '',
            tone: 'info',
            linkUrl: '',
            linkLabel: '',
            isActive: true,
            startAt: null,
            endAt: null,
            showOnAdmin: false,
            sortOrder: 0,
          })
        }
      >
        New announcement
      </Button>

      {editing && (
        <div className="rounded-2xl border border-line bg-paper-50 p-6 space-y-4">
          <Input label="Title (optional)" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          <Textarea label="Message" value={editing.message} onChange={(e) => setEditing({ ...editing, message: e.target.value })} rows={3} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted">Tone</label>
              <select
                value={editing.tone}
                onChange={(e) => setEditing({ ...editing, tone: e.target.value as Announcement['tone'] })}
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <Input label="Sort order" type="number" value={String(editing.sortOrder)} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start (local)" type="datetime-local" value={toLocalInput(editing.startAt)} onChange={(e) => setEditing({ ...editing, startAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            <Input label="End (local)" type="datetime-local" value={toLocalInput(editing.endAt)} onChange={(e) => setEditing({ ...editing, endAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Link URL" value={editing.linkUrl ?? ''} onChange={(e) => setEditing({ ...editing, linkUrl: e.target.value })} />
            <Input label="Link label" value={editing.linkLabel ?? ''} onChange={(e) => setEditing({ ...editing, linkLabel: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editing.showOnAdmin} onChange={(e) => setEditing({ ...editing, showOnAdmin: e.target.checked })} />
            Show in admin panel too
          </label>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void save(editing)}>Save</Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="divide-y divide-line rounded-2xl border border-line bg-paper-50">
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center font-serif italic text-ink-muted">No announcements yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
              <div>
                <div className="font-display font-bold text-ink">{item.title || 'Untitled'}</div>
                <p className="mt-1 font-serif text-sm italic text-ink-muted">{item.message}</p>
                <p className="mt-2 font-mono text-[10px] uppercase text-ink-soft">
                  {item.tone} · {item.isActive ? 'active' : 'off'}
                  {item.startAt ? ` · from ${new Date(item.startAt).toLocaleString()}` : ''}
                  {item.endAt ? ` · until ${new Date(item.endAt).toLocaleString()}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(item)}>Edit</Button>
                <Button type="button" variant="outline" onClick={() => void remove(item.id)}>Delete</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
