'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Initial = {
  paymentUsdtPortalEnabled: boolean;
  paymentUsdtPortalEmail: string;
  paymentUsdtRate: number;
  paymentPaypalEnabled: boolean;
  paymentPaypalClientId: string;
  paymentPaypalMode: string;
  paymentPaypalWebhookId: string;
  paymentStripeEnabled: boolean;
  paymentStripePublishableKey: string;
};

export function PaymentSettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [state, setState] = React.useState(initial);
  const [paypalSecret, setPaypalSecret] = React.useState('');
  const [stripeSecret, setStripeSecret] = React.useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = React.useState('');
  const [usdtPortalApiKey, setUsdtPortalApiKey] = React.useState('');
  const [usdtPortalCallbackPassword, setUsdtPortalCallbackPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  function patch<K extends keyof Initial>(k: K, v: Initial[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const payload: Record<string, unknown> = { ...state };
    // Only send secrets when admin actually typed something — empty string
    // means "leave existing value alone".
    if (paypalSecret.trim()) payload.paymentPaypalClientSecret = paypalSecret.trim();
    if (stripeSecret.trim()) payload.paymentStripeSecretKey = stripeSecret.trim();
    if (stripeWebhookSecret.trim()) payload.paymentStripeWebhookSecret = stripeWebhookSecret.trim();
    if (usdtPortalApiKey.trim()) payload.paymentUsdtPortalApiKey = usdtPortalApiKey.trim();
    if (usdtPortalCallbackPassword.trim())
      payload.paymentUsdtPortalCallbackPassword = usdtPortalCallbackPassword.trim();
    const res = await fetch('/api/admin/payment-settings', {
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
    toast.success('Payment settings saved');
    setPaypalSecret('');
    setStripeSecret('');
    setStripeWebhookSecret('');
    setUsdtPortalApiKey('');
    setUsdtPortalCallbackPassword('');
    router.refresh();
  }

  const callbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/payment/usdt-portal/callback`
      : '/api/payment/usdt-portal/callback';
  const paypalWebhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/payment/paypal/webhook`
      : '/api/payment/paypal/webhook';
  const stripeWebhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/payment/stripe/webhook`
      : '/api/payment/stripe/webhook';

  return (
    <div className="space-y-8">
      <Section
        title="USDT Portal (hosted)"
        description="Auto-credit via usdtportal.com hosted checkout. Drop-in compatible with their Dhru gateway protocol — supports BEP20, TRC20, ERC20, Binance C2C."
      >
        <Toggle
          label="Enable USDT Portal"
          checked={state.paymentUsdtPortalEnabled}
          onChange={(v) => patch('paymentUsdtPortalEnabled', v)}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Account email"
            value={state.paymentUsdtPortalEmail}
            onChange={(e) => patch('paymentUsdtPortalEmail', e.target.value.trim())}
            placeholder="merchant@yoursite.com"
          />
          <Input
            label="API key (write-only)"
            type="password"
            placeholder="Leave blank to keep existing"
            value={usdtPortalApiKey}
            onChange={(e) => setUsdtPortalApiKey(e.target.value)}
          />
          <Input
            label="USD per 1 USDT (default 1.0 for 1:1 peg)"
            type="number"
            min={0}
            max={100}
            step={0.0001}
            value={state.paymentUsdtRate}
            onChange={(e) => patch('paymentUsdtRate', Number(e.target.value))}
          />
          <Input
            label="Secret callback password (write-only)"
            type="password"
            placeholder="Leave blank to keep existing"
            value={usdtPortalCallbackPassword}
            onChange={(e) => setUsdtPortalCallbackPassword(e.target.value)}
          />
        </div>
        <div className="mt-4 rounded-xl border border-line bg-paper p-4 text-xs">
          <div className="font-mono uppercase tracking-[0.18em] text-ink-muted">
            Configure in your USDT Portal merchant panel
          </div>
          <div className="mt-2 space-y-1">
            <div>
              <span className="font-semibold">Callback URL:</span>{' '}
              <code className="font-mono break-all">{callbackUrl}</code>
            </div>
            <div>
              <span className="font-semibold">Whitelist your server IP</span> in the merchant panel
              — otherwise place-order requests return 403.
            </div>
            <div className="text-ink-muted">
              Wallet is USD-native. The USDT rate converts USD → USDT for the hosted checkout.
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="PayPal"
        description="Hosted PayPal Checkout. Cards + PayPal balance + Pay Later. Wallet credits when capture completes (browser return + webhook fallback)."
      >
        <Toggle
          label="Enable PayPal"
          checked={state.paymentPaypalEnabled}
          onChange={(v) => patch('paymentPaypalEnabled', v)}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Client ID"
            value={state.paymentPaypalClientId}
            onChange={(e) => patch('paymentPaypalClientId', e.target.value.trim())}
          />
          <Input
            label="Client secret (write-only)"
            type="password"
            placeholder="Leave blank to keep existing"
            value={paypalSecret}
            onChange={(e) => setPaypalSecret(e.target.value)}
          />
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Mode
            </label>
            <select
              value={state.paymentPaypalMode}
              onChange={(e) => patch('paymentPaypalMode', e.target.value as 'sandbox' | 'live')}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm"
            >
              <option value="sandbox">sandbox</option>
              <option value="live">live</option>
            </select>
          </div>
          <Input
            label="Webhook ID"
            value={state.paymentPaypalWebhookId}
            onChange={(e) => patch('paymentPaypalWebhookId', e.target.value.trim())}
            placeholder="Webhook ID from PayPal dashboard"
          />
        </div>
        <div className="mt-4 rounded-xl border border-line bg-paper p-4 text-xs">
          <div className="font-mono uppercase tracking-[0.18em] text-ink-muted">
            Configure in PayPal developer dashboard
          </div>
          <div className="mt-2 space-y-1">
            <div>
              <span className="font-semibold">Webhook URL:</span>{' '}
              <code className="font-mono break-all">{paypalWebhookUrl}</code>
            </div>
            <div>
              <span className="font-semibold">Subscribe to:</span>{' '}
              <code className="font-mono">CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED</code>
            </div>
            <div className="text-ink-muted">
              Copy the resulting Webhook ID into the field above. Currency is USD.
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Stripe"
        description="Hosted Stripe Checkout — cards, Apple Pay, Google Pay, link. Wallet credits on webhook checkout.session.completed."
      >
        <Toggle
          label="Enable Stripe"
          checked={state.paymentStripeEnabled}
          onChange={(v) => patch('paymentStripeEnabled', v)}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Publishable key"
            value={state.paymentStripePublishableKey}
            onChange={(e) => patch('paymentStripePublishableKey', e.target.value.trim())}
            placeholder="pk_…"
          />
          <Input
            label="Secret key (write-only)"
            type="password"
            placeholder="Leave blank to keep existing"
            value={stripeSecret}
            onChange={(e) => setStripeSecret(e.target.value)}
          />
          <Input
            label="Webhook secret (write-only)"
            type="password"
            placeholder="whsec_…"
            value={stripeWebhookSecret}
            onChange={(e) => setStripeWebhookSecret(e.target.value)}
          />
        </div>
        <div className="mt-4 rounded-xl border border-line bg-paper p-4 text-xs">
          <div className="font-mono uppercase tracking-[0.18em] text-ink-muted">
            Configure in Stripe dashboard
          </div>
          <div className="mt-2 space-y-1">
            <div>
              <span className="font-semibold">Webhook URL:</span>{' '}
              <code className="font-mono break-all">{stripeWebhookUrl}</code>
            </div>
            <div>
              <span className="font-semibold">Subscribe to:</span>{' '}
              <code className="font-mono">checkout.session.completed, checkout.session.async_payment_succeeded</code>
            </div>
            <div className="text-ink-muted">
              Copy the resulting whsec_… into the field above. Currency is USD.
            </div>
          </div>
        </div>
      </Section>

      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-card-hover">
        <span className="font-serif text-sm italic text-ink-muted">
          Secrets are stored as written; rotate via the same form.
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
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper-50 p-6">
      <h2 className="border-b border-line pb-3 font-display text-base font-extrabold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 font-serif text-sm italic text-ink-muted">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary-500' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
