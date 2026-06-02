'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { X, FloppyDisk, CaretDown } from '@phosphor-icons/react/dist/ssr';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SECTION_LABELS, type SectionType } from '@/lib/cms-types';
import { resolveSettings, hasVariants, defaultVariant, type SectionStyle } from '@/lib/cms-style';
import { StylePanel, VariantPicker } from './StylePanel';

type Item = {
  id: string;
  sectionType: string;
  title: string | null;
  subtitle: string | null;
  content: unknown;
  settings?: unknown;
  isVisible: boolean;
};

export function SectionEditor({
  item,
  onSaved,
  onClose,
}: {
  item: Item;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [content, setContent] = React.useState<Record<string, unknown>>(
    (item.content as Record<string, unknown>) ?? {},
  );
  // Resolve stored settings into a fully-populated style + variant.
  const resolved = React.useMemo(
    () => resolveSettings(item.settings, item.sectionType),
    [item.settings, item.sectionType],
  );
  const [style, setStyle] = React.useState<SectionStyle>(resolved.style);
  const [variant, setVariant] = React.useState<string | null>(resolved.variant);
  const [advanced, setAdvanced] = React.useState(false);
  const [rawJson, setRawJson] = React.useState(JSON.stringify(content, null, 2));
  const [saving, setSaving] = React.useState(false);
  const [showStyle, setShowStyle] = React.useState(false);

  React.useEffect(() => {
    setContent((item.content as Record<string, unknown>) ?? {});
    setRawJson(JSON.stringify(item.content ?? {}, null, 2));
    const r = resolveSettings(item.settings, item.sectionType);
    setStyle(r.style);
    setVariant(r.variant);
  }, [item]);

  async function save() {
    setSaving(true);
    let payloadContent: unknown = content;
    if (advanced) {
      try {
        payloadContent = JSON.parse(rawJson);
      } catch {
        toast.error('Invalid JSON');
        setSaving(false);
        return;
      }
    }
    // Build settings payload. Only send variant when this type supports it.
    const settings: Record<string, unknown> = { style };
    if (hasVariants(item.sectionType)) {
      settings.variant = variant ?? defaultVariant(item.sectionType);
    }
    const res = await fetch(`/api/admin/cms/sections/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: payloadContent, settings }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? 'Save failed');
      return;
    }
    onSaved();
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Editing section
          </span>
          <h3 className="mt-1 font-display text-lg font-extrabold tracking-tight text-ink">
            {SECTION_LABELS[item.sectionType as SectionType] ?? item.sectionType}
          </h3>
        </div>
        <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-paper-200 hover:text-ink">
          <X size={14} weight="bold" />
        </button>
      </div>

      {/* Variant picker (only for types with a variant catalog) */}
      {hasVariants(item.sectionType) && !advanced && (
        <div className="mt-5">
          <VariantPicker sectionType={item.sectionType} value={variant} onChange={setVariant} />
        </div>
      )}

      <div className="mt-5 space-y-5">
        {advanced ? (
          <Textarea
            label="Content JSON"
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            rows={14}
            className="font-mono text-xs"
          />
        ) : (
          <Fields
            type={item.sectionType as SectionType}
            content={content}
            setContent={setContent}
            heroLayout={variant ?? 'standard'}
          />
        )}
      </div>

      {/* Style panel (collapsible) */}
      {!advanced && (
        <div className="mt-6 rounded-xl border border-line bg-paper-50">
          <button
            type="button"
            onClick={() => setShowStyle((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Section style
            </span>
            <CaretDown
              size={14}
              weight="bold"
              className={`text-ink-muted transition-transform ${showStyle ? 'rotate-180' : ''}`}
            />
          </button>
          {showStyle && (
            <div className="border-t border-line p-4">
              <StylePanel style={style} onChange={setStyle} />
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        <button
          onClick={() => {
            if (!advanced) setRawJson(JSON.stringify(content, null, 2));
            else {
              try {
                setContent(JSON.parse(rawJson));
              } catch {
                /* ignore */
              }
            }
            setAdvanced((v) => !v);
          }}
          className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          {advanced ? '← Form mode' : 'Edit raw JSON →'}
        </button>
        <Button onClick={save} size="sm" disabled={saving}>
          {saving ? 'Saving…' : (
            <>
              <FloppyDisk size={12} weight="bold" /> Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Form-mode fields per section type
function Fields({
  type,
  content,
  setContent,
  heroLayout = 'standard',
}: {
  type: SectionType;
  content: Record<string, unknown>;
  setContent: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  /** Structural hero layout — the visual-card picker only shows for 'standard'. */
  heroLayout?: string;
}) {
  function setField(key: string, value: unknown) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  switch (type) {
    case 'hero':
      return (
        <>
          <Input
            label="Eyebrow"
            value={(content.eyebrow as string) ?? ''}
            onChange={(e) => setField('eyebrow', e.target.value)}
          />
          <Textarea
            label="Heading"
            hint="Wrap a word in {italic:word} for serif italic emphasis."
            value={(content.heading as string) ?? ''}
            onChange={(e) => setField('heading', e.target.value)}
            rows={3}
          />
          <Textarea
            label="Subhead"
            value={(content.subhead as string) ?? ''}
            onChange={(e) => setField('subhead', e.target.value)}
            rows={3}
          />
          <Input
            label="Primary CTA text"
            value={(content.ctaText as string) ?? ''}
            onChange={(e) => setField('ctaText', e.target.value)}
          />
          <Input
            label="Primary CTA href"
            value={(content.ctaHref as string) ?? ''}
            onChange={(e) => setField('ctaHref', e.target.value)}
          />
          <Input
            label="Secondary text"
            value={(content.secondaryText as string) ?? ''}
            onChange={(e) => setField('secondaryText', e.target.value)}
          />
          <Input
            label="Secondary href"
            value={(content.secondaryHref as string) ?? ''}
            onChange={(e) => setField('secondaryHref', e.target.value)}
          />
          {heroLayout === 'split-image' && (
            <Input
              label="Image URL (right column)"
              hint="Shown in the split-image layout. Use an https or /relative URL."
              value={(content.bgImageUrl as string) ?? ''}
              onChange={(e) => setField('bgImageUrl', e.target.value)}
            />
          )}
          {heroLayout === 'standard' && (
            <HeroVisualPicker
              value={((content.visualVariant as string) ?? 'ticket')}
              onChange={(v) => setField('visualVariant', v)}
            />
          )}
        </>
      );

    case 'features':
      return (
        <FeaturesFields content={content} setContent={setContent} />
      );

    case 'stats':
      return (
        <StatsFields content={content} setContent={setContent} />
      );

    case 'cta':
      return (
        <>
          <Input
            label="Eyebrow"
            value={(content.eyebrow as string) ?? ''}
            onChange={(e) => setField('eyebrow', e.target.value)}
          />
          <Textarea
            label="Heading"
            hint="Use {italic:word} for serif emphasis."
            value={(content.heading as string) ?? ''}
            onChange={(e) => setField('heading', e.target.value)}
            rows={3}
          />
          <Textarea
            label="Subhead"
            value={(content.subhead as string) ?? ''}
            onChange={(e) => setField('subhead', e.target.value)}
            rows={2}
          />
          <Input
            label="CTA text"
            value={(content.ctaText as string) ?? ''}
            onChange={(e) => setField('ctaText', e.target.value)}
          />
          <Input
            label="CTA href"
            value={(content.ctaHref as string) ?? ''}
            onChange={(e) => setField('ctaHref', e.target.value)}
          />
        </>
      );

    case 'spacer':
      return (
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Height
          </label>
          <select
            value={(content.height as string) ?? 'md'}
            onChange={(e) => setField('height', e.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
          >
            <option value="sm">Small (3rem)</option>
            <option value="md">Medium (6rem)</option>
            <option value="lg">Large (10rem)</option>
            <option value="xl">Extra large (14rem)</option>
          </select>
        </div>
      );

    case 'custom_html':
      return (
        <Textarea
          label="HTML"
          hint="Will be rendered as-is. Use with care."
          value={(content.html as string) ?? ''}
          onChange={(e) => setField('html', e.target.value)}
          rows={10}
          className="font-mono text-xs"
        />
      );

    case 'faq':
    case 'testimonials':
      return (
        <Textarea
          label="Heading"
          hint="Use {italic:word} for serif emphasis."
          value={(content.heading as string) ?? ''}
          onChange={(e) => setField('heading', e.target.value)}
          rows={2}
        />
      );

    default:
      return (
        <p className="font-serif text-sm italic text-ink-muted">
          This section type doesn&rsquo;t have form fields yet — use the raw JSON editor below.
        </p>
      );
  }
}

// ─── Per-type field groups ─────────────────────────────────────

import { HERO_VISUAL_VARIANTS } from '@/components/landing/visuals';

function HeroVisualPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        Hero visual variant
      </label>
      <p className="mt-1 font-serif text-xs italic text-ink-muted">
        The animated card on the right side of the hero. Each one has its own personality.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {HERO_VISUAL_VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            className={`group relative overflow-hidden rounded-lg border p-3 text-left transition-all ${
              value === v.id
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                : 'border-line bg-paper hover:border-ink'
            }`}
          >
            <VisualThumb id={v.id} active={value === v.id} />
            <div className="mt-2 font-display text-xs font-bold tracking-tight text-ink">
              {v.label}
            </div>
            <div className="mt-0.5 line-clamp-2 font-serif text-[10px] italic leading-snug text-ink-muted">
              {v.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function VisualThumb({ id, active }: { id: string; active: boolean }) {
  // Tiny SVG thumbnails representing each variant
  if (id === 'ticket') {
    return (
      <svg viewBox="0 0 80 50" className="w-full">
        <rect width="80" height="50" rx="4" fill="rgb(var(--paper-100))" />
        <rect x="6" y="6" width="68" height="6" rx="1" fill={active ? 'rgb(var(--primary-500))' : 'rgb(var(--ink) / 0.2)'} />
        <rect x="6" y="18" width="40" height="3" rx="1" fill="rgb(var(--ink) / 0.4)" />
        <rect x="6" y="24" width="60" height="2" rx="1" fill="rgb(var(--ink) / 0.15)" />
        <rect x="6" y="30" width="50" height="2" rx="1" fill="rgb(var(--ink) / 0.15)" />
        <rect x="6" y="36" width="35" height="2" rx="1" fill="rgb(var(--ink) / 0.15)" />
        <rect x="46" y="33" width="22" height="6" rx="1" stroke={active ? 'rgb(var(--primary-500))' : 'rgb(var(--ink) / 0.3)'} strokeWidth="0.5" strokeDasharray="2 1" fill="none" />
      </svg>
    );
  }
  if (id === 'console') {
    return (
      <svg viewBox="0 0 80 50" className="w-full">
        <rect width="80" height="50" rx="4" fill="rgb(var(--ink))" />
        <circle cx="6" cy="5" r="1" fill="rgb(var(--paper) / 0.6)" />
        <circle cx="10" cy="5" r="1" fill="rgb(var(--paper) / 0.6)" />
        <circle cx="14" cy="5" r="1" fill="rgb(var(--paper) / 0.6)" />
        <rect x="4" y="14" width="3" height="2" fill={active ? 'rgb(var(--amber-400))' : 'rgb(var(--paper) / 0.5)'} />
        <rect x="9" y="14" width="50" height="2" fill="rgb(var(--paper) / 0.4)" />
        <rect x="4" y="20" width="40" height="2" fill="rgb(var(--accent-400))" />
        <rect x="4" y="26" width="55" height="2" fill="rgb(var(--paper) / 0.3)" />
        <rect x="4" y="32" width="20" height="2" fill={active ? 'rgb(var(--primary-300))' : 'rgb(var(--paper) / 0.4)'} />
        <rect x="4" y="38" width="35" height="2" fill="rgb(34 197 94 / 0.7)" />
      </svg>
    );
  }
  if (id === 'dashboard') {
    return (
      <svg viewBox="0 0 80 50" className="w-full">
        <rect width="80" height="50" rx="4" fill="rgb(var(--paper-100))" />
        <rect x="4" y="4" width="42" height="22" rx="2" fill="rgb(var(--paper))" stroke="rgb(var(--line))" strokeWidth="0.5" />
        <circle cx="14" cy="15" r="6" fill="none" stroke={active ? 'rgb(var(--primary-500))' : 'rgb(var(--ink) / 0.3)'} strokeWidth="2" strokeDasharray="32 10" transform="rotate(-90 14 15)" />
        <rect x="48" y="4" width="28" height="22" rx="2" fill={active ? 'rgb(var(--primary-500))' : 'rgb(var(--ink))'} />
        <rect x="51" y="8" width="14" height="2" fill="rgb(var(--paper) / 0.6)" />
        <rect x="51" y="12" width="20" height="4" fill="rgb(var(--paper))" />
        <path d="M51 22 L 56 19 L 60 21 L 64 17 L 68 18 L 72 15" fill="none" stroke="rgb(var(--paper) / 0.7)" strokeWidth="1" />
        <rect x="4" y="30" width="72" height="16" rx="2" fill="rgb(var(--paper))" stroke="rgb(var(--line))" strokeWidth="0.5" />
        <rect x="6" y="33" width="3" height="3" rx="1.5" fill="rgb(var(--ink))" />
        <rect x="11" y="33" width="20" height="2" fill="rgb(var(--ink))" />
        <rect x="11" y="36" width="14" height="1" fill="rgb(var(--ink) / 0.4)" />
        <rect x="6" y="40" width="3" height="3" rx="1.5" fill="rgb(var(--ink))" />
        <rect x="11" y="40" width="22" height="2" fill="rgb(var(--ink))" />
      </svg>
    );
  }
  if (id === 'phone') {
    return (
      <svg viewBox="0 0 80 50" className="w-full">
        <rect width="80" height="50" rx="4" fill="rgb(var(--paper-100))" />
        <rect x="32" y="6" width="16" height="38" rx="3" fill="rgb(var(--ink))" />
        <rect x="34" y="9" width="12" height="32" rx="1" fill={active ? 'rgb(var(--primary-700))' : 'rgb(var(--ink))'} />
        <circle cx="40" cy="20" r="4" fill="none" stroke="rgb(var(--paper))" strokeWidth="1.5" />
        <rect x="38" y="18" width="4" height="4" rx="0.5" fill="rgb(var(--paper))" />
        <rect x="36" y="28" width="8" height="1" fill="rgb(var(--paper) / 0.6)" />
        <rect x="36" y="30.5" width="6" height="1" fill="rgb(var(--paper) / 0.4)" />
        {active && (
          <>
            <circle cx="22" cy="15" r="1.2" fill="rgb(var(--primary-400))" />
            <circle cx="58" cy="35" r="1.2" fill="rgb(var(--primary-400))" />
            <circle cx="60" cy="12" r="1.2" fill="rgb(var(--accent-500))" />
            <circle cx="20" cy="38" r="1.2" fill="rgb(var(--accent-500))" />
          </>
        )}
      </svg>
    );
  }
  return null;
}

type FieldsProps = {
  content: Record<string, unknown>;
  setContent: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
};

type FeatureItem = { num?: string; title: string; description: string };

function FeaturesFields({ content, setContent }: FieldsProps) {
  const items = ((content.items as FeatureItem[]) ?? []).map((it) => ({ ...it }));
  const cols = Number(content.columns ?? 3);

  function setItems(next: FeatureItem[]) {
    setContent((prev) => ({ ...prev, items: next }));
  }
  function patchItem(idx: number, patch: Partial<FeatureItem>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems([...items, { num: String(items.length + 1).padStart(2, '0'), title: '', description: '' }]);
  }
  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }
  function moveItem(idx: number, dir: -1 | 1) {
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setItems(next);
  }

  return (
    <>
      <Textarea
        label="Heading"
        hint="Use {italic:word} for serif emphasis."
        value={(content.heading as string) ?? ''}
        onChange={(e) => setContent((s) => ({ ...s, heading: e.target.value }))}
        rows={2}
      />
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Columns
        </label>
        <div className="mt-2 grid grid-cols-4 gap-1 rounded-full border border-line bg-paper-50 p-1">
          {[1, 2, 3, 4].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setContent((s) => ({ ...s, columns: c }))}
              className={`rounded-full py-1.5 text-xs font-bold transition-colors ${
                cols === c ? 'bg-ink text-paper' : 'text-ink/60 hover:bg-paper-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Items ({items.length})
          </label>
          <button
            type="button"
            onClick={addItem}
            className="rounded-full bg-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-paper hover:bg-primary-600"
          >
            + Add item
          </button>
        </div>
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-lg border border-line bg-paper p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                  Item {idx + 1}
                </span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveItem(idx, -1)} className="text-ink-muted hover:text-ink">
                    ↑
                  </button>
                  <button type="button" onClick={() => moveItem(idx, 1)} className="text-ink-muted hover:text-ink">
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
              <Input
                label="Number"
                value={it.num ?? ''}
                onChange={(e) => patchItem(idx, { num: e.target.value })}
                placeholder="01"
              />
              <div className="mt-2">
                <Input
                  label="Title"
                  value={it.title}
                  onChange={(e) => patchItem(idx, { title: e.target.value })}
                />
              </div>
              <div className="mt-2">
                <Textarea
                  label="Description"
                  value={it.description}
                  onChange={(e) => patchItem(idx, { description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

type StatItem = { label: string; value: string; note?: string };

function StatsFields({ content, setContent }: FieldsProps) {
  const items = ((content.items as StatItem[]) ?? []).map((it) => ({ ...it }));

  function setItems(next: StatItem[]) {
    setContent((prev) => ({ ...prev, items: next }));
  }
  function patchItem(idx: number, patch: Partial<StatItem>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems([...items, { label: '', value: '', note: '' }]);
  }
  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }
  function moveItem(idx: number, dir: -1 | 1) {
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setItems(next);
  }

  return (
    <>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Stat items ({items.length})
          </label>
          <button
            type="button"
            onClick={addItem}
            className="rounded-full bg-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-paper hover:bg-primary-600"
          >
            + Add stat
          </button>
        </div>
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-lg border border-line bg-paper p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                  Stat {idx + 1}
                </span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveItem(idx, -1)} className="text-ink-muted hover:text-ink">
                    ↑
                  </button>
                  <button type="button" onClick={() => moveItem(idx, 1)} className="text-ink-muted hover:text-ink">
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
              <Input
                label="Value"
                value={it.value}
                onChange={(e) => patchItem(idx, { value: e.target.value })}
                placeholder="98.7%"
              />
              <div className="mt-2">
                <Input
                  label="Label"
                  value={it.label}
                  onChange={(e) => patchItem(idx, { label: e.target.value })}
                  placeholder="Closed successful"
                />
              </div>
              <div className="mt-2">
                <Input
                  label="Note (optional)"
                  value={it.note ?? ''}
                  onChange={(e) => patchItem(idx, { note: e.target.value })}
                  placeholder="Last 30 days"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
