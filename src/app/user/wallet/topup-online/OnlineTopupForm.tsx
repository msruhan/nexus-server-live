'use client';

import * as React from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Gateway = { id: string; label: string; description: string; ready: boolean };

type RedirectPayload = { kind: 'redirect'; url: string };
type AnyPayload = RedirectPayload | { kind: 'embedded'; clientSecret: string; publishableKey: string };

const presets = [5, 10, 25, 50, 100];

const GATEWAY_IMAGES: Record<string, { src: string; width: number; height: number; alt: string }> = {
  usdt_portal: { src: '/uploads/banners/usdtportal.png', width: 180, height: 60, alt: 'USDT Portal' },
  paypal:      { src: '/uploads/banners/paypal.png',     width: 150, height: 60, alt: 'PayPal' },
  stripe:      { src: '/uploads/banners/stripe.png',     width: 120, height: 60, alt: 'Stripe' },
};

function GatewayLogo({ id }: { id: string }) {
  const img = GATEWAY_IMAGES[id];
  if (!img) return null;
  return (
    <Image
      src={img.src}
      alt={img.alt}
      width={img.width}
      height={img.height}
      className="h-14 max-h-14 w-auto max-w-full object-contain object-left"
      unoptimized
    />
  );
}

export function OnlineTopupForm({ gateways }: { gateways: Gateway[] }) {
  const [gateway, setGateway] = React.useState(gateways[0]?.id ?? '');
  const [amount, setAmount] = React.useState('10');
  const [submitting, setSubmitting] = React.useState(false);
  const [created, setCreated] = React.useState<{
    payload: AnyPayload;
    intent: {
      id: string;
      reference: string;
      amount: string;
      expiresAt: string;
    } | null;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/user/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gateway, amount: Number(amount) }),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to start top-up', { description: json.error });
      return;
    }
    setCreated(json.data);
    toast.success('Redirecting to payment gateway…');
  }

  // Redirect handler — all current gateways use hosted checkout.
  if (created && created.payload.kind === 'redirect') {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.href = (created.payload as RedirectPayload).url;
      }, 600);
    }
    return (
      <div className="space-y-4 rounded-2xl border border-line bg-paper-50 p-6">
        <h3 className="font-display text-lg font-extrabold tracking-tight">
          Redirecting to payment gateway…
        </h3>
        <p className="text-sm text-ink-muted">
          You will be taken to the payment page. Complete the payment there and your wallet will be
          credited automatically.
        </p>
        <a
          href={(created.payload as RedirectPayload).url}
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-primary-600"
        >
          Continue to gateway →
        </a>
        <button
          type="button"
          onClick={() => setCreated(null)}
          className="block text-xs text-ink-muted underline-offset-4 hover:underline"
        >
          Cancel and go back
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-paper-50 p-6">
      {/* Gateway picker */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Payment method
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {gateways.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGateway(g.id)}
              disabled={!g.ready}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                gateway === g.id
                  ? 'border-ink bg-ink/5 shadow-sm'
                  : 'border-line bg-paper hover:border-ink/40'
              } ${!g.ready ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {/* Logo */}
              <div className="mb-3 flex min-h-16 items-center">
                <GatewayLogo id={g.id} />
              </div>
              {/* Label + description */}
              <div className="text-sm font-semibold text-ink">{g.label}</div>
              <div className="mt-0.5 text-xs text-ink-muted">{g.description}</div>
              {!g.ready && (
                <div className="mt-1 text-[10px] uppercase tracking-wide text-amber-700">
                  Not configured
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Amount picker */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Amount (USD)
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                amount === String(p)
                  ? 'border-ink bg-ink/5 font-semibold'
                  : 'border-line bg-paper-50 hover:border-ink/40'
              }`}
            >
              ${p}
            </button>
          ))}
        </div>
        <Input
          className="mt-3"
          label="Custom amount"
          type="number"
          min={1}
          max={50000}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          hint="Minimum $1.00"
        />
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-line bg-paper p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">You pay</span>
          <span className="font-semibold">${Number(amount || 0).toFixed(2)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-ink-muted">Method</span>
          <span className="font-semibold">
            {gateways.find((g) => g.id === gateway)?.label ?? '—'}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-ink-muted">Credited to</span>
          <span className="font-semibold">Your wallet</span>
        </div>
      </div>

      <Button type="submit" disabled={submitting || !gateway} className="w-full">
        {submitting ? 'Creating payment…' : 'Continue to payment →'}
      </Button>

      <p className="text-center text-xs text-ink-muted">
        You will be redirected to the payment provider. Your wallet is credited automatically after
        confirmation.
      </p>
    </form>
  );
}
