'use client';

import * as React from 'react';
import {
  BACKGROUNDS,
  PADDINGS,
  ALIGNS,
  WIDTHS,
  DIVIDERS,
  VARIANTS,
  GRADIENT_PRESETS,
  hasVariants,
  safeUrl,
  safeHexColor,
  type SectionStyle,
  type SectionBackground,
  type SectionPadding,
  type SectionAlign,
  type SectionWidth,
  type SectionDivider,
} from '@/lib/cms-style';

/** Local editable shape mirroring SectionStyle (all fields present). */
export type StyleState = SectionStyle;

const BG_LABELS: Record<SectionBackground, string> = {
  paper: 'Paper',
  ink: 'Dark',
  primary: 'Primary',
  gradient: 'Gradient',
  image: 'Image',
};
const PAD_LABELS: Record<SectionPadding, string> = {
  compact: 'Compact',
  normal: 'Normal',
  spacious: 'Spacious',
};
const WIDTH_LABELS: Record<SectionWidth, string> = {
  narrow: 'Narrow',
  wide: 'Wide',
  full: 'Full',
};

function Segmented<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labels?: Record<string, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </label>
      <div className="mt-1.5 flex flex-wrap gap-1 rounded-lg border border-line bg-paper-50 p-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
              value === opt ? 'bg-ink text-paper' : 'text-ink/60 hover:bg-paper-100 hover:text-ink'
            }`}
          >
            {labels?.[opt] ?? opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function GradientPicker({
  style,
  onChange,
}: {
  style: StyleState;
  onChange: (patch: Partial<StyleState>) => void;
}) {
  const isCustom = style.gradientPreset === 'custom';
  const customPreview = `linear-gradient(${style.gradientAngle}deg, ${safeHexColor(style.gradientFrom) ?? '#1f48e6'}, ${safeHexColor(style.gradientTo) ?? '#06b6d4'})`;

  return (
    <div className="space-y-3 rounded-lg border border-line bg-paper-50 p-3">
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Gradient preset
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              onClick={() => onChange({ gradientPreset: preset.id })}
              className={`group relative overflow-hidden rounded-lg border p-2 text-left transition-all ${
                style.gradientPreset === preset.id
                  ? 'border-primary-500 ring-2 ring-primary-500/25'
                  : 'border-line hover:border-ink/30'
              }`}
            >
              <div
                className="h-10 w-full rounded-md"
                style={{ backgroundImage: preset.css }}
                aria-hidden
              />
              <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                {preset.label}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ gradientPreset: 'custom' })}
            className={`relative overflow-hidden rounded-lg border p-2 text-left transition-all ${
              isCustom
                ? 'border-primary-500 ring-2 ring-primary-500/25'
                : 'border-line hover:border-ink/30'
            }`}
          >
            <div
              className="h-10 w-full rounded-md border border-dashed border-line"
              style={{ backgroundImage: customPreview }}
              aria-hidden
            />
            <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-wider text-ink-muted">
              Custom
            </span>
          </button>
        </div>
      </div>

      {isCustom && (
        <div className="space-y-3 border-t border-line pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                From color
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={safeHexColor(style.gradientFrom) ?? '#1f48e6'}
                  onChange={(e) => onChange({ gradientFrom: e.target.value })}
                  className="h-9 w-10 cursor-pointer rounded border border-line bg-paper"
                />
                <input
                  type="text"
                  value={style.gradientFrom ?? ''}
                  maxLength={7}
                  placeholder="#1f48e6"
                  onChange={(e) => {
                    const hex = safeHexColor(e.target.value);
                    onChange({ gradientFrom: hex ?? e.target.value });
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 font-mono text-xs text-ink focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                To color
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={safeHexColor(style.gradientTo) ?? '#06b6d4'}
                  onChange={(e) => onChange({ gradientTo: e.target.value })}
                  className="h-9 w-10 cursor-pointer rounded border border-line bg-paper"
                />
                <input
                  type="text"
                  value={style.gradientTo ?? ''}
                  maxLength={7}
                  placeholder="#06b6d4"
                  onChange={(e) => {
                    const hex = safeHexColor(e.target.value);
                    onChange({ gradientTo: hex ?? e.target.value });
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 font-mono text-xs text-ink focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <span>Angle</span>
              <span className="tabular-nums text-ink">{style.gradientAngle}°</span>
            </label>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={style.gradientAngle}
              onChange={(e) => onChange({ gradientAngle: Number(e.target.value) })}
              className="mt-2 w-full accent-primary-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function VariantPicker({
  sectionType,
  value,
  onChange,
}: {
  sectionType: string;
  value: string | null;
  onChange: (v: string) => void;
}) {
  if (!hasVariants(sectionType)) return null;
  const variants = VARIANTS[sectionType];
  const current = value ?? variants[0].id;

  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        Layout variant
      </label>
      <p className="mt-1 font-serif text-xs italic text-ink-muted">
        Change the structural layout of this section.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            className={`rounded-lg border p-3 text-left transition-all ${
              current === v.id
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                : 'border-line bg-paper hover:border-ink'
            }`}
          >
            <div className="font-display text-xs font-bold tracking-tight text-ink">{v.label}</div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-soft">
              {v.id}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function StylePanel({
  style,
  onChange,
}: {
  style: StyleState;
  onChange: (next: StyleState) => void;
}) {
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const [imageDraft, setImageDraft] = React.useState(style.bgImageUrl ?? '');
  const patch = (p: Partial<StyleState>) => onChange({ ...style, ...p });

  React.useEffect(() => {
    setImageDraft(style.bgImageUrl ?? '');
  }, [style.bgImageUrl]);

  function commitImageUrl(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setUrlError(null);
      patch({ bgImageUrl: null });
      return;
    }
    const safe = safeUrl(trimmed);
    if (!safe) {
      setUrlError('Invalid URL — must be http(s) or a /relative path.');
      return;
    }
    setUrlError(null);
    patch({ bgImageUrl: safe });
  }

  return (
    <div className="space-y-4">
      <Segmented<SectionBackground>
        label="Background"
        value={style.background}
        options={BACKGROUNDS}
        labels={BG_LABELS}
        onChange={(v) => patch({ background: v })}
      />

      {style.background === 'gradient' && (
        <GradientPicker style={style} onChange={patch} />
      )}

      {style.background === 'image' && (
        <div className="space-y-3 rounded-lg border border-line bg-paper-50 p-3">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Background image URL
            </label>
            <input
              type="text"
              value={imageDraft}
              maxLength={2048}
              placeholder="https://… or /uploads/…"
              onChange={(e) => {
                const raw = e.target.value;
                setImageDraft(raw);
                if (!raw.trim()) {
                  setUrlError(null);
                  patch({ bgImageUrl: null });
                  return;
                }
                const safe = safeUrl(raw.trim());
                if (safe) {
                  setUrlError(null);
                  patch({ bgImageUrl: safe });
                }
              }}
              onBlur={(e) => commitImageUrl(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs text-ink focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            {urlError && <p className="mt-1 text-[11px] font-medium text-red-600">{urlError}</p>}
            {style.bgImageUrl && (
              <div className="mt-3 overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={style.bgImageUrl}
                  alt=""
                  className="aspect-[16/7] w-full object-cover"
                  onError={() => setUrlError('Image failed to load — check the URL is reachable.')}
                />
              </div>
            )}
          </div>
          <div>
            <label className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <span>Overlay opacity</span>
              <span className="tabular-nums text-ink">{style.bgOverlay}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={style.bgOverlay}
              onChange={(e) => patch({ bgOverlay: Number(e.target.value) })}
              className="mt-2 w-full accent-primary-500"
            />
          </div>
        </div>
      )}

      <Segmented<SectionPadding>
        label="Padding"
        value={style.padding}
        options={PADDINGS}
        labels={PAD_LABELS}
        onChange={(v) => patch({ padding: v })}
      />
      <Segmented<SectionAlign>
        label="Alignment"
        value={style.align}
        options={ALIGNS}
        onChange={(v) => patch({ align: v })}
      />
      <Segmented<SectionWidth>
        label="Content width"
        value={style.width}
        options={WIDTHS}
        labels={WIDTH_LABELS}
        onChange={(v) => patch({ width: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Segmented<SectionDivider>
          label="Divider top"
          value={style.dividerTop}
          options={DIVIDERS}
          onChange={(v) => patch({ dividerTop: v })}
        />
        <Segmented<SectionDivider>
          label="Divider bottom"
          value={style.dividerBottom}
          options={DIVIDERS}
          onChange={(v) => patch({ dividerBottom: v })}
        />
      </div>
    </div>
  );
}
