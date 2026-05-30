'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Initial = {
  siteName: string;
  siteTagline: string;
  primaryColor: string;
  enableRegistration: boolean;
  enableDirectPayment: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  enforceAdmin2FA: boolean;
  metaTitle: string;
  metaDescription: string;
  socialInstagram: string;
  socialWhatsapp: string;
  socialTelegram: string;
  footerText: string;
};

export function SettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [state, setState] = React.useState(initial);

  function patch<K extends keyof Initial>(k: K, v: Initial[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error('Save failed');
      return;
    }
    toast.success('Settings saved');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-12">
      <Card title="Brand & identity">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Site name"
            value={state.siteName}
            onChange={(e) => patch('siteName', e.target.value)}
          />
          <Input
            label="Tagline"
            value={state.siteTagline}
            onChange={(e) => patch('siteTagline', e.target.value)}
          />
          <Input
            label="Primary color"
            value={state.primaryColor}
            onChange={(e) => patch('primaryColor', e.target.value)}
            suffix={
              <span
                className="block h-5 w-5 rounded-full border border-line"
                style={{ background: state.primaryColor }}
              />
            }
          />
        </div>
      </Card>

      <Card title="Feature flags">
        <div className="space-y-3">
          <Toggle
            label="Enable user registration"
            checked={state.enableRegistration}
            onChange={(v) => patch('enableRegistration', v)}
          />
          <Toggle
            label="Enable direct payment (gateway)"
            checked={state.enableDirectPayment}
            onChange={(v) => patch('enableDirectPayment', v)}
          />
          <Toggle
            label="Maintenance mode"
            description="Public pages will show the maintenance message. Admin remains accessible."
            checked={state.maintenanceMode}
            onChange={(v) => patch('maintenanceMode', v)}
          />
          {state.maintenanceMode && (
            <Textarea
              label="Maintenance message"
              value={state.maintenanceMessage}
              onChange={(e) => patch('maintenanceMessage', e.target.value)}
              rows={3}
            />
          )}
        </div>
      </Card>

      <Card title="Security">
        <Toggle
          label="Force 2FA for admin accounts"
          description="When ON, admin users without 2FA are redirected to a setup page until they enable it. Existing sessions stay valid; new admin route hits enforce."
          checked={state.enforceAdmin2FA}
          onChange={(v) => patch('enforceAdmin2FA', v)}
        />
      </Card>

      <Card title="SEO">
        <div className="space-y-5">
          <Input
            label="Meta title"
            value={state.metaTitle}
            onChange={(e) => patch('metaTitle', e.target.value)}
          />
          <Textarea
            label="Meta description"
            value={state.metaDescription}
            onChange={(e) => patch('metaDescription', e.target.value)}
            rows={3}
          />
        </div>
      </Card>

      <Card title="Social links">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Instagram"
            value={state.socialInstagram}
            onChange={(e) => patch('socialInstagram', e.target.value)}
          />
          <Input
            label="WhatsApp"
            value={state.socialWhatsapp}
            onChange={(e) => patch('socialWhatsapp', e.target.value)}
          />
          <Input
            label="Telegram"
            value={state.socialTelegram}
            onChange={(e) => patch('socialTelegram', e.target.value)}
          />
        </div>
      </Card>

      <Card title="Footer">
        <Textarea
          label="Footer text"
          value={state.footerText}
          onChange={(e) => patch('footerText', e.target.value)}
          rows={2}
        />
      </Card>

      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-card-hover">
        <span className="font-serif text-sm italic text-ink-muted">
          Changes apply immediately on save.
        </span>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper-50 p-6">
      <h2 className="border-b border-line pb-3 font-display text-base font-extrabold tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-line bg-paper p-4">
      <div>
        <div className="font-medium text-ink">{label}</div>
        {description && <div className="mt-1 font-serif text-xs italic text-ink-muted">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary-500' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
