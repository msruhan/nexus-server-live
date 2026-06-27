'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Input, Textarea } from '@/components/ui/Input';
import type { CatalogServiceRow, HowToOrderStep, RunningAdsTickerItem } from '@/lib/cms-types';
import type { CatalogPickService } from '@/lib/catalog-services-shared';
import { refreshRowsFromPickList } from '@/lib/catalog-services-shared';
import { CatalogServicePicker, CatalogSyncToolbar } from './CatalogServicePicker';

type FieldsProps = {
  content: Record<string, unknown>;
  setContent: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
};

function ListEditor<T extends Record<string, unknown>>({
  label,
  items,
  onChange,
  renderItem,
  makeEmpty,
}: {
  label: string;
  items: T[];
  onChange: (next: T[]) => void;
  renderItem: (item: T, idx: number, patch: (p: Partial<T>) => void) => React.ReactNode;
  makeEmpty: () => T;
}) {
  function move(idx: number, dir: -1 | 1) {
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          {label} ({items.length})
        </label>
        <button
          type="button"
          onClick={() => onChange([...items, makeEmpty()])}
          className="rounded-full bg-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-paper hover:bg-primary-600"
        >
          + Add
        </button>
      </div>
      <div className="space-y-3">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-lg border border-line bg-paper p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                #{idx + 1}
              </span>
              <div className="flex gap-1">
                <button type="button" onClick={() => move(idx, -1)} className="text-ink-muted hover:text-ink">↑</button>
                <button type="button" onClick={() => move(idx, 1)} className="text-ink-muted hover:text-ink">↓</button>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== idx))}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
            {renderItem(it, idx, (p) => onChange(items.map((row, i) => (i === idx ? { ...row, ...p } : row))))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CatalogFields({ content, setContent }: FieldsProps) {
  const [pickerKind, setPickerKind] = React.useState<'imei' | 'server' | null>(null);
  const [refreshing, setRefreshing] = React.useState<'imei' | 'server' | null>(null);

  function setField(key: string, value: unknown) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  const imei = ((content.imeiServices as CatalogServiceRow[]) ?? []).map((r) => ({ ...r }));
  const server = ((content.serverServices as CatalogServiceRow[]) ?? []).map((r) => ({ ...r }));

  const imeiLinkedIds = new Set(imei.filter((r) => r.serviceId).map((r) => r.serviceId!));
  const serverLinkedIds = new Set(server.filter((r) => r.serviceId).map((r) => r.serviceId!));

  async function refreshTab(kind: 'imei' | 'server') {
    setRefreshing(kind);
    try {
      const res = await fetch('/api/admin/cms/catalog-services');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed to load services');
      const pool = (json.services?.[kind] as CatalogPickService[]) ?? [];
      const rows = kind === 'imei' ? imei : server;
      const next = refreshRowsFromPickList(rows, pool, kind);
      setField(kind === 'imei' ? 'imeiServices' : 'serverServices', next);
      toast.success('Linked rows refreshed from marketplace');
    } catch (e) {
      toast.error('Refresh failed', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setRefreshing(null);
    }
  }

  function addRows(kind: 'imei' | 'server', rows: CatalogServiceRow[]) {
    const key = kind === 'imei' ? 'imeiServices' : 'serverServices';
    const current = kind === 'imei' ? imei : server;
    setField(key, [...current, ...rows]);
  }

  const serviceRowFields = (row: CatalogServiceRow, patch: (p: Partial<CatalogServiceRow>) => void) => (
    <div className="space-y-2">
      {row.serviceId && (
        <div className="rounded-md bg-primary-50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-800">
          Linked · live sync · {row.kind ?? 'service'} · {row.serviceId.slice(0, 8)}…
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input label="Ref" value={row.ref} onChange={(e) => patch({ ref: e.target.value })} />
        <Input label="Price" value={row.price} onChange={(e) => patch({ price: e.target.value })} />
      </div>
      <Input label="Title" value={row.title} onChange={(e) => patch({ title: e.target.value })} />
      <Input label="Meta" value={row.meta} onChange={(e) => patch({ meta: e.target.value })} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input label="Delivery" value={row.delivery} onChange={(e) => patch({ delivery: e.target.value })} />
        <Input label="Order link" value={row.orderHref ?? ''} onChange={(e) => patch({ orderHref: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-ink">
        <input
          type="checkbox"
          checked={!!row.popular}
          onChange={(e) => patch({ popular: e.target.checked })}
        />
        Highlight (badge)
      </label>
      {row.popular && (
        <Input label="Badge text" value={row.tag ?? ''} onChange={(e) => patch({ tag: e.target.value })} />
      )}
      {row.serviceId && (
        <button
          type="button"
          onClick={() => patch({ serviceId: undefined, kind: undefined })}
          className="font-mono text-[10px] uppercase tracking-wider text-red-600 hover:underline"
        >
          Unlink (keep as manual row)
        </button>
      )}
    </div>
  );

  return (
    <>
      <Input label="Eyebrow" value={(content.eyebrow as string) ?? ''} onChange={(e) => setField('eyebrow', e.target.value)} />
      <Textarea
        label="Heading"
        hint="Use {italic:word} for emphasis."
        value={(content.heading as string) ?? ''}
        onChange={(e) => setField('heading', e.target.value)}
        rows={2}
      />
      <Textarea label="Subhead" value={(content.subhead as string) ?? ''} onChange={(e) => setField('subhead', e.target.value)} rows={3} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="IMEI tab label" value={(content.imeiTabLabel as string) ?? ''} onChange={(e) => setField('imeiTabLabel', e.target.value)} />
        <Input label="Server tab label" value={(content.serverTabLabel as string) ?? ''} onChange={(e) => setField('serverTabLabel', e.target.value)} />
      </div>
      <Input
        label="Footer text"
        hint="Use {count} for the number of visible rows."
        value={(content.footerText as string) ?? ''}
        onChange={(e) => setField('footerText', e.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Catalog link text" value={(content.catalogLinkText as string) ?? ''} onChange={(e) => setField('catalogLinkText', e.target.value)} />
        <Input label="Catalog link href" value={(content.catalogLinkHref as string) ?? ''} onChange={(e) => setField('catalogLinkHref', e.target.value)} />
      </div>
      <CatalogSyncToolbar
        kind="imei"
        linkedCount={imeiLinkedIds.size}
        onBrowse={() => setPickerKind('imei')}
        onRefresh={() => void refreshTab('imei')}
        refreshing={refreshing === 'imei'}
      />
      <ListEditor
        label="Unlock services (IMEI tab)"
        items={imei}
        onChange={(next) => setField('imeiServices', next)}
        makeEmpty={() => ({ ref: '', title: '', meta: '', delivery: '', price: '', orderHref: '/marketplace' })}
        renderItem={(row, _idx, patch) => serviceRowFields(row, patch)}
      />
      <CatalogSyncToolbar
        kind="server"
        linkedCount={serverLinkedIds.size}
        onBrowse={() => setPickerKind('server')}
        onRefresh={() => void refreshTab('server')}
        refreshing={refreshing === 'server'}
      />
      <ListEditor
        label="Remote services (Server tab)"
        items={server}
        onChange={(next) => setField('serverServices', next)}
        makeEmpty={() => ({ ref: '', title: '', meta: '', delivery: '', price: '', orderHref: '/marketplace' })}
        renderItem={(row, _idx, patch) => serviceRowFields(row, patch)}
      />

      {pickerKind && (
        <CatalogServicePicker
          kind={pickerKind}
          existingIds={pickerKind === 'imei' ? imeiLinkedIds : serverLinkedIds}
          onAdd={(rows) => addRows(pickerKind, rows)}
          onClose={() => setPickerKind(null)}
        />
      )}
    </>
  );
}

export function PartnersFields({ content, setContent }: FieldsProps) {
  function setField(key: string, value: unknown) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  const row1 = ((content.row1 as string[]) ?? []).map(String);
  const row2 = ((content.row2 as string[]) ?? []).map(String);

  function stringListEditor(label: string, items: string[], key: 'row1' | 'row2') {
    return (
      <ListEditor
        label={label}
        items={items.map((name) => ({ name }))}
        onChange={(next) => setField(key, next.map((r) => r.name))}
        makeEmpty={() => ({ name: '' })}
        renderItem={(row, _idx, patch) => (
          <Input label="Name" value={row.name} onChange={(e) => patch({ name: e.target.value })} />
        )}
      />
    );
  }

  return (
    <>
      <Input label="Eyebrow" value={(content.eyebrow as string) ?? ''} onChange={(e) => setField('eyebrow', e.target.value)} />
      <Input label="Subtitle" value={(content.subtitle as string) ?? ''} onChange={(e) => setField('subtitle', e.target.value)} />
      {stringListEditor('Marquee row 1', row1, 'row1')}
      {stringListEditor('Marquee row 2 (reverse scroll)', row2, 'row2')}
    </>
  );
}

export function RunningAdsFields({ content, setContent }: FieldsProps) {
  const items = ((content.fallbackItems as RunningAdsTickerItem[]) ?? []).map((r) => ({ ...r }));

  return (
    <>
      <p className="font-serif text-xs italic text-ink-muted">
        Live ticker items come from <strong>Admin → Running ads</strong>. The list below is only used when no active running ads exist.
      </p>
      <ListEditor
        label="Fallback ticker items"
        items={items}
        onChange={(next) => setContent((prev) => ({ ...prev, fallbackItems: next }))}
        makeEmpty={() => ({ tag: 'NOTE', text: '', href: '' })}
        renderItem={(row, _idx, patch) => (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input label="Tag" value={row.tag} onChange={(e) => patch({ tag: e.target.value })} />
              <Input label="Link (optional)" value={row.href ?? ''} onChange={(e) => patch({ href: e.target.value })} />
            </div>
            <Input label="Text" value={row.text} onChange={(e) => patch({ text: e.target.value })} />
          </div>
        )}
      />
    </>
  );
}

export function HowToOrderFields({ content, setContent }: FieldsProps) {
  function setField(key: string, value: unknown) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  const steps = ((content.steps as HowToOrderStep[]) ?? []).map((s) => ({ ...s }));

  return (
    <>
      <Input label="Eyebrow" value={(content.eyebrow as string) ?? ''} onChange={(e) => setField('eyebrow', e.target.value)} />
      <Textarea
        label="Heading"
        hint="Use {italic:word} for emphasis."
        value={(content.heading as string) ?? ''}
        onChange={(e) => setField('heading', e.target.value)}
        rows={2}
      />
      <Textarea label="Subhead" value={(content.subhead as string) ?? ''} onChange={(e) => setField('subhead', e.target.value)} rows={2} />
      <ListEditor
        label="Steps"
        items={steps}
        onChange={(next) => setField('steps', next)}
        makeEmpty={() => ({
          no: String(steps.length + 1).padStart(2, '0'),
          icon: 'search' as const,
          title: '',
          body: '',
          ctaHref: '/marketplace',
          ctaLabel: 'Learn more',
        })}
        renderItem={(step, _idx, patch) => (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <Input label="Step no." value={step.no} onChange={(e) => patch({ no: e.target.value })} />
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Icon</label>
                <select
                  value={step.icon ?? 'search'}
                  onChange={(e) => patch({ icon: e.target.value as HowToOrderStep['icon'] })}
                  className="mt-1.5 block w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm"
                >
                  <option value="search">Search</option>
                  <option value="cart">Cart</option>
                  <option value="map">Map</option>
                </select>
              </div>
            </div>
            <Input label="Title" value={step.title} onChange={(e) => patch({ title: e.target.value })} />
            <Textarea label="Body" value={step.body} onChange={(e) => patch({ body: e.target.value })} rows={2} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input label="CTA label" value={step.ctaLabel ?? ''} onChange={(e) => patch({ ctaLabel: e.target.value })} />
              <Input label="CTA href" value={step.ctaHref ?? ''} onChange={(e) => patch({ ctaHref: e.target.value })} />
            </div>
          </div>
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Bottom browse label" value={(content.bottomBrowseLabel as string) ?? ''} onChange={(e) => setField('bottomBrowseLabel', e.target.value)} />
        <Input label="Bottom browse href" value={(content.ctaBrowseHref as string) ?? ''} onChange={(e) => setField('ctaBrowseHref', e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Bottom track label" value={(content.bottomTrackLabel as string) ?? ''} onChange={(e) => setField('bottomTrackLabel', e.target.value)} />
        <Input label="Bottom track href" value={(content.ctaTrackHref as string) ?? ''} onChange={(e) => setField('ctaTrackHref', e.target.value)} />
      </div>
    </>
  );
}

const BANNER_POSITIONS = ['home_top', 'home_middle', 'sidebar', 'service_page', 'popup'];

export function BannerSliderFields({ content, setContent }: FieldsProps) {
  function setField(key: string, value: unknown) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <p className="font-serif text-xs italic text-ink-muted">
        Slides come from <strong>Admin → Banners</strong>. Choose which banner position to show in this section.
      </p>
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Banner position</label>
        <select
          value={(content.position as string) ?? 'home_top'}
          onChange={(e) => setField('position', e.target.value)}
          className="mt-1.5 block w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm"
        >
          {BANNER_POSITIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-ink">
        <input
          type="checkbox"
          checked={content.autoplay !== false}
          onChange={(e) => setField('autoplay', e.target.checked)}
        />
        Autoplay carousel
      </label>
    </>
  );
}
