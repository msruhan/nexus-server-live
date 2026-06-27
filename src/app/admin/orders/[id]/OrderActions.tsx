'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmProvider';

export function OrderActions({
  orderId,
  type,
  cancellable,
}: {
  orderId: string;
  type: 'imei' | 'server';
  cancellable: boolean;
}) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [busy, setBusy] = React.useState(false);

  async function call(action: 'cancel' | 'retry') {
    if (action === 'cancel') {
      const ok = await confirmDialog({
        title: 'Cancel order',
        description: 'Cancel order and refund the user?',
        confirmLabel: 'Cancel order',
        tone: 'warning',
      });
      if (!ok) return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/orders/${orderId}/${action}?type=${type}`, {
      method: 'POST',
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(`${action} failed`, { description: j.error });
      return;
    }
    toast.success(action === 'cancel' ? 'Order cancelled · wallet refunded' : 'Retry queued');
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => call('cancel')}
        disabled={!cancellable || busy}
        className="block w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
      >
        {busy ? 'Working…' : 'Cancel & refund'}
      </button>
      <button
        onClick={() => call('retry')}
        disabled={busy}
        className="block w-full rounded-lg border border-line bg-paper px-4 py-2 text-xs font-bold text-ink hover:border-ink disabled:opacity-50"
      >
        Retry submit upstream
      </button>
    </div>
  );
}
