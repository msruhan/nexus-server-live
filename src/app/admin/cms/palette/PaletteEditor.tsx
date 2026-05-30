'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowsClockwise,
  Check,
  FloppyDisk,
  Eye,
  X,
  Palette,
  Sparkle,
} from '@phosphor-icons/react/dist/ssr';
import {
  hexToRgbTriplet,
  paletteToCssVars,
  type PaletteTemplate,
  type PaletteTokens,
} from '@/lib/palettes';
import { Button } from '@/components/ui/Button';

// Tokens grouped for the custom editor UI.
const GROUPS: Array<{ title: string; tokens: Array<keyof PaletteTokens> }> = [
  { title: 'Surface', tokens: ['paper', 'paper-50', 'paper-100', 'paper-200'] },
  { title: 'Lines', tokens: ['line', 'line-strong'] },
  { title: 'Text (ink)', tokens: ['ink', 'ink-muted', 'ink-soft'] },
  {
    title: 'Primary',
    tokens: ['primary-50', 'primary-100', 'primary-200', 'primary-300', 'primary-400', 'primary-500', 'primary-600', 'primary-700', 'primary-800', 'primary-900', 'primary-950'],
  },
  { title: 'Accent', tokens: ['accent-400', 'accent-500', 'accent-600'] },
  { title: 'Amber', tokens: ['amber-400', 'amber-500', 'amber-600'] },
];

export function PaletteEditor({
  templates,
  activeTemplateId,
  custom,
  saveTarget = 'account',
}: {
  templates: PaletteTemplate[];
  activeTemplateId: string;
  custom: Partial<PaletteTokens>;
  /** account = per-user desk; site = public landing (admin CMS only) */
  saveTarget?: 'account' | 'site';
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState(activeTemplateId);
  const [overrides, setOverrides] = React.useState<Partial<PaletteTokens>>(custom);
  const [advanced, setAdvanced] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [previewKey, setPreviewKey] = React.useState(0);

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];

  // Effective tokens shown in the preview (live, not yet persisted)
  const effective = React.useMemo<PaletteTokens>(
    () => ({ ...selected.tokens, ...overrides }),
    [selected, overrides],
  );

  const dirty =
    selectedId !== activeTemplateId ||
    JSON.stringify(overrides) !== JSON.stringify(custom);

  function pickTemplate(id: string) {
    setSelectedId(id);
    setOverrides({}); // fresh start when switching
  }

  function patchToken(key: keyof PaletteTokens, value: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      // If matches template default, drop the override
      if (value.toLowerCase() === selected.tokens[key].toLowerCase()) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }

  function resetOverrides() {
    setOverrides({});
  }

  async function save() {
    setSaving(true);
    const payload = {
      paletteTemplate: selectedId,
      paletteCustom: Object.keys(overrides).length > 0 ? overrides : null,
    };
    const endpoint =
      saveTarget === 'site' ? '/api/admin/cms/palette' : '/api/user/palette';
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error('Save failed', { description: j.error ?? j.message });
      return;
    }
    toast.success('Palette saved', {
      description:
        saveTarget === 'site'
          ? 'Public landing colors are updated.'
          : 'Your desk theme is updated for this account only.',
    });
    router.refresh();
    setPreviewKey((k) => k + 1);
  }

  return (
    <>
      {/* Inject the live preview palette so the entire admin page demos it */}
      <style
        dangerouslySetInnerHTML={{
          __html: `[data-palette-preview]{${paletteToCssVars(effective)}}`,
        }}
      />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* LEFT — Templates gallery + custom tokens */}
        <div className="lg:col-span-7">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                Curated templates
              </h2>
              <span className="font-serif text-sm italic text-ink-muted">
                {templates.length} options
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={selectedId === t.id}
                  onSelect={() => pickTemplate(t.id)}
                />
              ))}
            </div>
          </section>

          {/* Custom overrides */}
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                  Custom overrides
                </h2>
                <p className="mt-1 font-serif text-sm italic text-ink-muted">
                  Tweak any token from{' '}
                  <span className="not-italic font-mono font-bold">{selected.name}</span>. Only
                  changed tokens are persisted.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAdvanced((v) => !v)}
                  className="rounded-full border border-line bg-paper-50 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider hover:border-ink"
                >
                  {advanced ? 'Essentials only' : 'All tokens'}
                </button>
                {Object.keys(overrides).length > 0 && (
                  <button
                    onClick={resetOverrides}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-paper hover:bg-primary-600"
                  >
                    <ArrowsClockwise size={11} weight="bold" />
                    Clear ({Object.keys(overrides).length})
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {GROUPS.filter((g) => advanced || essential(g.title)).map((g) => (
                <div key={g.title} className="rounded-2xl border border-line bg-paper-50 p-5">
                  <h3 className="border-b border-line pb-2 font-display text-sm font-bold tracking-tight text-ink">
                    {g.title}
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {g.tokens
                      .filter((tok) => advanced || essentialToken(tok))
                      .map((tok) => (
                        <ColorRow
                          key={tok}
                          name={tok}
                          value={effective[tok]}
                          isOverridden={!!overrides[tok]}
                          onChange={(v) => patchToken(tok, v)}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT — Sticky preview */}
        <aside className="lg:col-span-5">
          <div className="sticky top-8 space-y-4">
            <div data-palette-preview className="overflow-hidden rounded-2xl border border-line bg-paper-50 shadow-card-hover">
              <PreviewPanel template={selected} />
            </div>

            <div className="rounded-2xl border border-line bg-paper-50 p-5">
              <h3 className="border-b border-line pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Apply
              </h3>
              <p className="mt-3 font-serif text-sm italic text-ink-muted">
                {dirty
                  ? saveTarget === 'site'
                    ? 'You have unsaved changes. Save to update the public landing.'
                    : 'You have unsaved changes. Save to apply to your account only.'
                  : saveTarget === 'site'
                    ? 'Matches the current public landing palette.'
                    : 'Your saved account theme is active on this desk.'}
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <Button onClick={save} disabled={saving || !dirty} className="w-full justify-center">
                  {saving ? (
                    'Saving…'
                  ) : (
                    <>
                      <FloppyDisk size={12} weight="bold" />
                      Save palette
                    </>
                  )}
                </Button>
                <a
                  href="/admin/cms/landing-builder"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2 text-xs font-bold hover:border-ink"
                >
                  <Eye size={12} weight="bold" />
                  Open landing builder
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-paper-50 p-5" key={previewKey}>
              <h3 className="border-b border-line pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                What changes?
              </h3>
              <ul className="mt-3 space-y-1 font-serif text-sm italic text-ink-muted">
                <li>· Public landing &amp; all sections</li>
                <li>· User &amp; admin dashboards</li>
                <li>· Auth pages (login, register)</li>
                <li>· Buttons, badges, status pills</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function essential(group: string) {
  return ['Surface', 'Text (ink)', 'Primary', 'Accent'].includes(group);
}
function essentialToken(tok: string) {
  return [
    'paper',
    'paper-100',
    'ink',
    'ink-muted',
    'primary-500',
    'primary-700',
    'accent-500',
    'amber-500',
  ].includes(tok);
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: PaletteTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-2xl border bg-paper-50 text-left transition-all hover:shadow-card-hover ${
        selected ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-line hover:border-ink'
      }`}
    >
      {/* Visual preview strip using the template's actual tokens */}
      <div
        className="relative h-28"
        style={{
          background: template.swatchPaper,
        }}
      >
        {/* Faux hairline grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `linear-gradient(to right, ${template.swatchInk}0a 1px, transparent 1px), linear-gradient(to bottom, ${template.swatchInk}0a 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
        {/* Specimen */}
        <div className="relative flex h-full items-end gap-3 p-4">
          <span
            className="font-display text-2xl font-extrabold tracking-tightest"
            style={{ color: template.swatchInk }}
          >
            Aa
          </span>
          <span
            className="font-serif text-xl italic"
            style={{ color: template.swatchPrimary }}
          >
            italic.
          </span>
          <div className="ml-auto flex gap-1">
            {[template.swatchInk, template.swatchPrimary, template.swatchAccent].map((c, i) => (
              <span
                key={i}
                className="block h-5 w-5 rounded-full ring-1 ring-black/10"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        {selected && (
          <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-paper">
            <Check size={12} weight="bold" />
          </div>
        )}
        {template.isDark && (
          <div className="absolute left-3 top-3 rounded-full bg-paper/90 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink">
            Dark
          </div>
        )}
      </div>

      <div className="border-t border-line p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
            {template.name}
          </h3>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-soft">
            {template.id}
          </span>
        </div>
        <p className="mt-1 font-serif text-xs italic text-ink-muted">{template.description}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-paper-100 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted">
          <Sparkle size={9} weight="fill" />
          {template.mood}
        </div>
      </div>
    </motion.button>
  );
}

function ColorRow({
  name,
  value,
  isOverridden,
  onChange,
}: {
  name: string;
  value: string;
  isOverridden: boolean;
  onChange: (v: string) => void;
}) {
  const [text, setText] = React.useState(value);

  React.useEffect(() => {
    setText(value);
  }, [value]);

  function commit(raw: string) {
    const trimmed = raw.trim();
    const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange(hex.toLowerCase());
    } else {
      setText(value);
    }
  }

  return (
    <div className={`flex items-center gap-2.5 rounded-lg border bg-paper px-2 py-2 transition-colors ${
      isOverridden ? 'border-primary-400' : 'border-line'
    }`}>
      <label className="relative flex h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-line">
        <span className="absolute inset-0" style={{ background: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-muted">
          {name}
          {isOverridden && (
            <span className="ml-1.5 inline-block rounded bg-primary-500/15 px-1 py-0.5 text-[8px] tracking-wider text-primary-700">
              changed
            </span>
          )}
        </div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setText(value);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="block w-full bg-transparent font-mono text-xs text-ink outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function PreviewPanel({ template }: { template: PaletteTemplate }) {
  return (
    <div className="bg-paper text-ink">
      {/* Mini editorial showcase using palette */}
      <div className="border-b border-line bg-ink px-5 py-2 text-paper">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span className="rounded-sm bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.18em] text-white">
            LIVE
          </span>
          <span className="opacity-80">Preview · {template.name}</span>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            § Section preview
          </span>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
            A quiet desk for{' '}
            <span className="font-serif italic font-normal text-primary-700">loud problems</span>.
          </h2>
          <p className="mt-2 font-serif text-base italic text-ink-muted">
            Pull-quote, body text, and the occasional accent — all rendered with the live palette.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-paper">
            Open account
          </span>
          <span className="rounded-full bg-primary-500 px-3 py-1 text-xs font-bold text-white">
            Primary CTA
          </span>
          <span className="rounded-full border border-line bg-paper-50 px-3 py-1 text-xs font-bold text-ink">
            Secondary
          </span>
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-ink">
            Most ordered
          </span>
        </div>

        <div className="rounded-xl border border-line bg-paper-50 p-4">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            <span>Order docket</span>
            <span className="flex items-center gap-1.5">
              <span className="live-dot" />
              In process
            </span>
          </div>
          <div className="mt-3 font-mono text-sm font-bold text-ink">
            ID-K7VN3P2WXR9M
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
            {[
              { label: 'Status', value: 'Live' },
              { label: 'Median', value: '02:14' },
              { label: 'Success', value: '98.7%' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-mono text-[8px] uppercase tracking-wider text-ink-soft">
                  {s.label}
                </div>
                <div className="mt-0.5 font-display text-base font-black text-ink">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            'paper',
            'paper-100',
            'paper-200',
            'ink',
            'ink-muted',
            'ink-soft',
            'primary-500',
            'primary-700',
            'accent-500',
          ].map((tok) => (
            <div key={tok} className="rounded-md border border-line bg-paper">
              <div
                className="h-8 rounded-t-md"
                style={{ background: `rgb(var(--${tok}))` }}
              />
              <div className="px-1.5 py-1 font-mono text-[8px] uppercase tracking-wider text-ink-muted">
                {tok}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
