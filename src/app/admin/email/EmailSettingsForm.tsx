'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Initial = {
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpFromAddress: string;
  smtpFromName: string;
  smtpEvents: string[];
};

export function EmailSettingsForm({
  initial,
  availableEvents,
}: {
  initial: Initial;
  availableEvents: string[];
}) {
  const router = useRouter();
  const [state, setState] = React.useState(initial);
  const [password, setPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testTo, setTestTo] = React.useState('');

  function patch<K extends keyof Initial>(k: K, v: Initial[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  function toggleEvent(e: string) {
    setState((s) => {
      const has = s.smtpEvents.includes(e);
      return { ...s, smtpEvents: has ? s.smtpEvents.filter((x) => x !== e) : [...s.smtpEvents, e] };
    });
  }

  async function save() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      ...state,
      smtpEvents: state.smtpEvents.join(','),
    };
    if (password.trim()) payload.smtpPassword = password;
    delete (payload as { smtpEvents: unknown }).smtpEvents;
    payload.smtpEvents = state.smtpEvents.join(',');

    const res = await fetch('/api/admin/email-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok || !json.success) {
      toast.error('Save failed', { description: json.error });
      return;
    }
    toast.success('SMTP settings saved');
    setPassword('');
    router.refresh();
  }

  async function verify() {
    if (!state.smtpHost.trim() || !password.trim()) {
      toast.error('Enter host + password before verifying');
      return;
    }
    setVerifying(true);
    const res = await fetch('/api/admin/email-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        host: state.smtpHost,
        port: state.smtpPort,
        secure: state.smtpSecure,
        user: state.smtpUsername,
        pass: password,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setVerifying(false);
    if (!res.ok || !json.success) {
      toast.error('Verify failed', { description: json.error });
      return;
    }
    toast.success('SMTP credentials look good');
  }

  async function testSend() {
    if (!testTo.trim()) {
      toast.error('Enter a recipient email');
      return;
    }
    setTesting(true);
    const res = await fetch('/api/admin/email-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test_send', to: testTo.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    setTesting(false);
    if (!res.ok || !json.success) {
      toast.error('Send failed', { description: json.error });
      return;
    }
    toast.success(`Test email queued to ${testTo}`);
    setTestTo('');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Section title="SMTP transport">
        <Toggle
          label="Enable email notifications"
          description="When OFF, every send call returns silently. No emails leave the server."
          checked={state.smtpEnabled}
          onChange={(v) => patch('smtpEnabled', v)}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Host"
            placeholder="smtp.example.com"
            value={state.smtpHost}
            onChange={(e) => patch('smtpHost', e.target.value.trim())}
          />
          <Input
            label="Port"
            type="number"
            min={1}
            max={65535}
            value={state.smtpPort}
            onChange={(e) => patch('smtpPort', Number(e.target.value))}
          />
          <div className="sm:col-span-2">
            <Toggle
              label="Use TLS on connect (port 465)"
              description="Otherwise STARTTLS is used (typical on 587 / 25)."
              checked={state.smtpSecure}
              onChange={(v) => patch('smtpSecure', v)}
            />
          </div>
          <Input
            label="Username"
            value={state.smtpUsername}
            onChange={(e) => patch('smtpUsername', e.target.value.trim())}
          />
          <Input
            label="Password (write-only)"
            type="password"
            placeholder="Leave blank to keep existing"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </Section>

      <Section title="From identity">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="From address"
            placeholder="noreply@yoursite.com"
            value={state.smtpFromAddress}
            onChange={(e) => patch('smtpFromAddress', e.target.value.trim())}
          />
          <Input
            label="From name"
            placeholder="Recovero"
            value={state.smtpFromName}
            onChange={(e) => patch('smtpFromName', e.target.value)}
          />
        </div>
      </Section>

      <Section
        title="Events"
        description="Select which events should trigger an email. If you select none, ALL events are enabled."
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {availableEvents.map((e) => (
            <label
              key={e}
              className="flex items-center gap-2 rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={state.smtpEvents.includes(e)}
                onChange={() => toggleEvent(e)}
                className="h-4 w-4"
              />
              <code className="font-mono text-[11px]">{e}</code>
            </label>
          ))}
        </div>
        <div className="mt-3 text-xs text-ink-muted">
          Selected: <strong>{state.smtpEvents.length === 0 ? 'all events' : state.smtpEvents.join(', ')}</strong>
        </div>
      </Section>

      <Section title="Verify & test">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void verify()} disabled={verifying}>
            {verifying ? 'Verifying…' : 'Verify connection'}
          </Button>
          <div className="flex flex-1 gap-2">
            <Input
              label=""
              placeholder="you@example.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={() => void testSend()} disabled={testing}>
              {testing ? 'Sending…' : 'Send test'}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Verify uses the host + password typed above. Test send uses the saved settings.
        </p>
      </Section>

      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-card-hover">
        <span className="font-serif text-sm italic text-ink-muted">
          Failures are logged to the audit table; the originating action is never blocked.
        </span>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper-50 p-6">
      <h2 className="border-b border-line pb-3 font-display text-base font-extrabold tracking-tight">
        {title}
      </h2>
      {description && <p className="mt-2 font-serif text-sm italic text-ink-muted">{description}</p>}
      <div className="mt-4">{children}</div>
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
    <button type="button" onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left">
      <span
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary-500' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
      <span>
        <span className="text-sm font-medium">{label}</span>
        {description && <div className="mt-1 font-serif text-xs italic text-ink-muted">{description}</div>}
      </span>
    </button>
  );
}
