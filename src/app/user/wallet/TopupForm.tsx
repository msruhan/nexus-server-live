'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const presets = [5, 10, 25, 50, 100, 200];

export function TopupForm() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [amount, setAmount] = React.useState<string>('10');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/user/wallet/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseInt(amount, 10),
        note: String(fd.get('note') ?? ''),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error('Top-up failed', { description: j.error });
      return;
    }
    toast.success('Top-up request submitted', {
      description: 'Admin will approve shortly.',
    });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-line bg-paper-50 p-6">
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Pick an amount
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                amount === String(p)
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-paper hover:border-ink/40'
              }`}
            >
              ${p}
            </button>
          ))}
        </div>
      </div>

      <Input
        type="number"
        name="amount"
        label="Custom amount (USD)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        min={1}
        required
      />

      <Textarea name="note" label="Note (optional)" rows={2} placeholder="e.g. Transfer via BCA · 12 Mar" />

      <Button type="submit" size="lg" disabled={loading} className="w-full">
        {loading ? 'Submitting…' : 'Submit top-up request'}
      </Button>
      <p className="font-serif text-xs italic text-ink-muted">
        An admin will review and approve your request. Balance is credited automatically after approval.
      </p>
    </form>
  );
}
