'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Eye, EyeSlash, Trash, X, ArrowSquareOut } from '@phosphor-icons/react/dist/ssr';
import { SortableList } from '@/components/dashboard/SortableList';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Menu = {
  id: string;
  location: string;
  label: string;
  href: string;
  icon: string | null;
  isExternal: boolean;
  isVisible: boolean;
};

const LOCATIONS = ['header', 'footer', 'mobile_bottom', 'sidebar'] as const;
type Location = (typeof LOCATIONS)[number];

export function MenuManager({ initial }: { initial: Menu[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [tab, setTab] = React.useState<Location>('header');
  const [editing, setEditing] = React.useState<Menu | 'new' | null>(null);

  React.useEffect(() => setItems(initial), [initial]);

  const filtered = items.filter((i) => i.location === tab);

  async function persistOrder(next: Menu[]) {
    setItems((prev) => [...prev.filter((i) => i.location !== tab), ...next]);
    await fetch('/api/admin/cms/menus/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: next.map((i) => i.id) }),
    });
    toast.success('Order saved');
  }

  async function toggle(item: Menu) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isVisible: !i.isVisible } : i)));
    await fetch(`/api/admin/cms/menus/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !item.isVisible }),
    });
  }

  async function remove(item: Menu) {
    if (!confirm(`Delete "${item.label}"?`)) return;
    const res = await fetch(`/api/admin/cms/menus/${item.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Delete failed');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success('Deleted');
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
          {LOCATIONS.map((loc) => {
            const count = items.filter((i) => i.location === loc).length;
            const active = tab === loc;
            return (
              <button
                key={loc}
                onClick={() => setTab(loc)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
                }`}
              >
                {loc} ({count})
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-paper hover:bg-primary-600"
        >
          <Plus weight="bold" size={12} /> New menu item
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-paper-50 px-6 py-16 text-center">
          <p className="font-serif italic text-ink-muted">No items in {tab} yet.</p>
        </div>
      ) : (
        <SortableList
          items={filtered}
          onReorder={persistOrder}
          renderItem={(item) => (
            <div
              className={`mb-2 flex items-center gap-3 rounded-xl border bg-paper-50 p-4 ${
                item.isVisible ? 'border-line' : 'border-line opacity-60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-ink">{item.label}</span>
                  {item.isExternal && <ArrowSquareOut size={12} weight="bold" className="text-ink-muted" />}
                </div>
                <div className="truncate font-mono text-[10px] text-ink-muted">{item.href}</div>
              </div>
              <button
                onClick={() => toggle(item)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-paper-200 hover:text-ink"
              >
                {item.isVisible ? <Eye size={14} /> : <EyeSlash size={14} />}
              </button>
              <button
                onClick={() => setEditing(item)}
                className="rounded-md px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-paper-200"
              >
                Edit
              </button>
              <button
                onClick={() => remove(item)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-red-50 hover:text-red-600"
              >
                <Trash size={14} />
              </button>
            </div>
          )}
        />
      )}

      {editing && (
        <MenuForm
          item={editing === 'new' ? null : editing}
          defaultLocation={tab}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function MenuForm({
  item,
  defaultLocation,
  onClose,
  onSaved,
}: {
  item: Menu | null;
  defaultLocation: Location;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = React.useState({
    location: item?.location ?? defaultLocation,
    label: item?.label ?? '',
    href: item?.href ?? '',
    icon: item?.icon ?? '',
    isExternal: item?.isExternal ?? false,
    isVisible: item?.isVisible ?? true,
  });
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!state.label || !state.href) {
      toast.error('Label and href are required');
      return;
    }
    setSaving(true);
    const url = item ? `/api/admin/cms/menus/${item.id}` : '/api/admin/cms/menus';
    const res = await fetch(url, {
      method: item ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error('Save failed');
      return;
    }
    toast.success(item ? 'Updated' : 'Created');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-paper shadow-card-hover">
        <div className="flex items-center justify-between border-b border-line bg-paper-100 px-5 py-3">
          <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
            {item ? 'Edit menu item' : 'New menu item'}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-line">
            <X size={14} weight="bold" />
          </button>
        </div>
        <div className="space-y-5 p-6">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Location
            </label>
            <select
              value={state.location}
              onChange={(e) => setState((s) => ({ ...s, location: e.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
            >
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <Input
            label="Label"
            value={state.label}
            onChange={(e) => setState((s) => ({ ...s, label: e.target.value }))}
            required
          />
          <Input
            label="Href"
            value={state.href}
            onChange={(e) => setState((s) => ({ ...s, href: e.target.value }))}
            placeholder="/services or https://example.com"
            required
          />
          <Input
            label="Icon (optional)"
            value={state.icon}
            onChange={(e) => setState((s) => ({ ...s, icon: e.target.value }))}
          />
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={state.isExternal}
              onChange={(e) => setState((s) => ({ ...s, isExternal: e.target.checked }))}
              className="h-4 w-4 rounded border-line"
            />
            <span className="text-sm">Open in new tab (external link)</span>
          </label>
        </div>
        <div className="flex justify-end border-t border-line bg-paper-100 px-5 py-3">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : item ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}
