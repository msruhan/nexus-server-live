'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Settings = {
  reportEmailEnabled: boolean;
  reportEmailTo: string | null;
  reportEmailFrequency: string;
  reportEmailHour: number;
  reportEmailLastSentAt: string | null;
  reportEmailNextRunAt: string | null;
};

export function ReportSchedulePanel({ initial }: { initial: Settings }) {
  const [state, setState] = React.useState({
    reportEmailEnabled: initial.reportEmailEnabled,
    reportEmailTo: initial.reportEmailTo ?? '',
    reportEmailFrequency: (initial.reportEmailFrequency === 'daily' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    reportEmailHour: initial.reportEmailHour ?? 8,
  });
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/reports/schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...state,
        reportEmailTo: state.reportEmailTo.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error('Save failed');
      return;
    }
    toast.success('Report schedule saved');
  }

  return (
    <div className="rounded-2xl border border-line bg-paper-50 p-6">
      <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">Scheduled email report</h2>
      <p className="mt-1 font-serif text-sm italic text-ink-muted">
        Sends revenue, profit, and success-rate summary to admin email. Requires SMTP enabled.
      </p>
      <label className="mt-4 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={state.reportEmailEnabled}
          onChange={(e) => setState((s) => ({ ...s, reportEmailEnabled: e.target.checked }))}
        />
        Enable scheduled reports
      </label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input
          label="Recipient email"
          type="email"
          value={state.reportEmailTo}
          onChange={(e) => setState((s) => ({ ...s, reportEmailTo: e.target.value }))}
          hint="Defaults to admin notification email if empty."
        />
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted">Frequency</label>
          <select
            value={state.reportEmailFrequency}
            onChange={(e) =>
              setState((s) => ({ ...s, reportEmailFrequency: e.target.value as 'daily' | 'weekly' }))
            }
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          >
            <option value="daily">Daily (last 24h)</option>
            <option value="weekly">Weekly (last 7 days, Mondays)</option>
          </select>
        </div>
        <Input
          label="Send hour (server local time, 0–23)"
          type="number"
          min={0}
          max={23}
          value={String(state.reportEmailHour)}
          onChange={(e) => setState((s) => ({ ...s, reportEmailHour: Number(e.target.value) }))}
        />
      </div>
      {(initial.reportEmailLastSentAt || initial.reportEmailNextRunAt) && (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          {initial.reportEmailLastSentAt && `Last sent: ${new Date(initial.reportEmailLastSentAt).toLocaleString()} · `}
          {initial.reportEmailNextRunAt && `Next: ${new Date(initial.reportEmailNextRunAt).toLocaleString()}`}
        </p>
      )}
      <Button type="button" className="mt-4" onClick={() => void save()} disabled={saving}>
        {saving ? 'Saving…' : 'Save schedule'}
      </Button>
    </div>
  );
}
