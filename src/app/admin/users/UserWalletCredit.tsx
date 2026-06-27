'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { IS_DEMO_MODE } from '@/lib/demo-mode-client';

export function UserWalletCredit({
  userId,
  userName,
  currentBalance,
}: {
  userId: string;
  userName: string;
  currentBalance: number;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function submit() {
    if (IS_DEMO_MODE) {
      toast.error('Demo mode', { description: 'Wallet changes are disabled in the live demo.' });
      return;
    }

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Invalid amount', { description: 'Enter a positive number.' });
      return;
    }

    const ok = await confirm({
      title: 'Add wallet credit?',
      description: `Credit $${value.toFixed(2)} to ${userName}. This posts a TOPUP ledger entry immediately.`,
      confirmLabel: 'Add credit',
      tone: 'default',
    });
    if (!ok) return;

    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}/credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: value, note: note.trim() || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !json.ok) {
      toast.error('Credit failed', { description: json.error ?? 'Unknown error' });
      return;
    }

    toast.success('Credit added', {
      description: `New balance: $${Number(json.balance).toFixed(2)}`,
    });
    setOpen(false);
    setAmount('');
    setNote('');
    router.refresh();
  }

  return (
    <>
      <div className="inline-flex items-center justify-end gap-2">
        <span className="font-mono">${currentBalance.toFixed(2)}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-ink hover:text-ink"
          title="Add credit"
        >
          <Plus weight="bold" size={14} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-card-hover">
            <h3 className="font-display text-lg font-extrabold text-ink">Add wallet credit</h3>
            <p className="mt-1 text-sm text-ink-muted">{userName}</p>

            <div className="mt-5 space-y-3">
              <label className="block text-sm">
                Amount (USD)
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-mono text-sm focus:border-ink focus:outline-none"
                  placeholder="e.g. 25.00"
                  autoFocus
                />
              </label>
              <label className="block text-sm">
                Note (optional)
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  placeholder="Promo credit, bank transfer, etc."
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink hover:border-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void submit()}
                className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-primary-600 disabled:opacity-60"
              >
                {loading ? 'Adding…' : 'Add credit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
