'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowSquareOut, Warning } from '@phosphor-icons/react/dist/ssr';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { MAINTENANCE_TEMPLATES, type MaintenanceTemplateId } from '@/components/maintenance/types';

type Initial = {
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  maintenanceTemplate: MaintenanceTemplateId;
  maintenanceEndsAt: string; // ISO or ''
};

/** Convert an ISO string to a value usable by <input type="datetime-local"> */
function isoToLocalInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function MaintenanceManager({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [mode, setMode] = React.useState(initial.maintenanceMode);
  const [title, setTitle] = React.useState(initial.maintenanceTitle);
  const [message, setMessage] = React.useState(initial.maintenanceMessage);
  const [template, setTemplate] = React.useState<MaintenanceTemplateId>(initial.maintenanceTemplate);
  const [endsAtLocal, setEndsAtLocal] = React.useState(isoToLocalInput(initial.maintenanceEndsAt));
  const [saving, setSaving] = React.useState(false);

  async function save(nextMode?: boolean) {
    setSaving(true);
    const payload = {
      maintenanceMode: nextMode ?? mode,
      maintenanceTitle: title.trim() || null,
      maintenanceMessage: message.trim() || null,
      maintenanceTemplate: template,
      maintenanceEndsAt: localInputToIso(endsAtLocal),
    };
    const res = await fetch('/api/admin/maintenance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to save', { description: json.error });
      return;
    }
    if (typeof nextMode === 'boolean') setMode(nextMode);
    toast.success(
      typeof nextMode === 'boolean'
        ? nextMode
          ? 'Maintenance mode ENABLED — site is now offline for visitors'
          : 'Maintenance mode disabled — site is back online'
        : 'Maintenance settings saved',
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <div
        className={`rounded-2xl border p-5 transition-colors ${
          mode ? 'border-amber-300 bg-amber-50' : 'border-line bg-paper-50'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                mode ? 'bg-amber-400 text-ink' : 'bg-ink text-paper'
              }`}
            >
              <Warning size={22} weight="fill" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">
                {mode ? 'Maintenance mode is ACTIVE' : 'Maintenance mode is off'}
              </h3>
              <p className="mt-1 max-w-xl text-sm text-ink-muted">
                {mode
                  ? 'Visitors and members see the maintenance page. You (admin / sub-admin) keep full access to the dashboard.'
                  : 'When enabled, all public pages and the member dashboard redirect to a maintenance page. Admins are unaffected.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={mode}
            onClick={() => void save(!mode)}
            disabled={saving}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              mode ? 'bg-amber-500' : 'bg-line'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                mode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Template picker */}
      <section className="rounded-2xl border border-line bg-paper-50 p-5">
        <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
          Page template
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          Pick the look of the maintenance page. Preview opens in a new tab.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MAINTENANCE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={`group overflow-hidden rounded-xl border text-left transition ${
                template === t.id ? 'border-ink ring-2 ring-ink/10' : 'border-line hover:border-ink/40'
              }`}
            >
              <TemplateThumb id={t.id} />
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t.label}</span>
                  {template === t.id && (
                    <span className="rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-paper">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-ink-muted">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <a
            href={`/maintenance-preview?template=${template}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline"
          >
            <ArrowSquareOut size={14} weight="bold" />
            Preview &ldquo;{MAINTENANCE_TEMPLATES.find((t) => t.id === template)?.label}&rdquo; template
          </a>
        </div>
      </section>

      {/* Content */}
      <section className="rounded-2xl border border-line bg-paper-50 p-5">
        <h3 className="font-display text-base font-extrabold tracking-tight text-ink">Content</h3>
        <div className="mt-4 space-y-4">
          <Input
            label="Headline"
            placeholder="Back in a moment."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <Textarea
            label="Message (HTML allowed)"
            rows={3}
            placeholder="We are performing scheduled maintenance…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
          />
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Countdown target (optional)
            </label>
            <input
              type="datetime-local"
              value={endsAtLocal}
              onChange={(e) => setEndsAtLocal(e.target.value)}
              className="mt-1.5 rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm text-ink"
            />
            {endsAtLocal && (
              <button
                type="button"
                onClick={() => setEndsAtLocal('')}
                className="ml-3 text-xs text-ink-muted hover:underline"
              >
                Clear
              </button>
            )}
            <p className="mt-1 text-[11px] italic text-ink-muted">
              Shows a live countdown on the maintenance page. Leave empty to hide it.
            </p>
          </div>
        </div>
      </section>

      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-card-hover">
        <span className="font-serif text-sm italic text-ink-muted">
          {mode ? 'Site is currently offline for visitors.' : 'Changes apply on save.'}
        </span>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}

/** Tiny CSS-only thumbnail representing each template's look. */
function TemplateThumb({ id }: { id: MaintenanceTemplateId }) {
  if (id === 'aurora') {
    return (
      <div className="relative h-24 w-full overflow-hidden bg-[#070a18]">
        <div className="absolute -left-4 top-0 h-16 w-16 rounded-full bg-indigo-500/60 blur-2xl" />
        <div className="absolute right-0 top-2 h-14 w-14 rounded-full bg-emerald-500/50 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 h-12 w-12 rounded-full bg-pink-500/50 blur-2xl" />
        <div className="absolute inset-x-0 bottom-3 mx-auto h-2 w-16 rounded-full bg-white/20" />
      </div>
    );
  }
  if (id === 'grid') {
    return (
      <div
        className="h-24 w-full bg-[#fbfaf6]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(15,23,42,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.1) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      >
        <div className="p-3">
          <div className="h-2 w-10 rounded bg-ink/70" />
          <div className="mt-2 h-2 w-16 rounded bg-primary-500/70" />
        </div>
      </div>
    );
  }
  if (id === 'orbit') {
    return (
      <div className="relative grid h-24 w-full place-items-center bg-[#05060c]">
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 shadow-[0_0_16px_rgba(56,189,248,0.7)]" />
        <div className="absolute h-12 w-12 rounded-full border border-white/20" />
        <div className="absolute h-20 w-20 rounded-full border border-white/10" />
      </div>
    );
  }
  return (
    <div className="grid h-24 w-full place-items-center bg-white">
      <div className="w-2/3">
        <div className="h-2 w-1/2 rounded bg-ink/80" />
        <div className="mt-2 h-1.5 w-full rounded bg-ink/[0.08]" />
        <div className="mt-1.5 h-1 w-2/5 rounded bg-ink" />
      </div>
    </div>
  );
}
