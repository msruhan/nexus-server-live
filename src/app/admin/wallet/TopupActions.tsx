'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function TopupActions({ topupId }: { topupId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function call(action: 'approve' | 'reject') {
    setBusy(true);
    const res = await fetch(`/api/admin/wallet/topup-requests/${topupId}/${action}`, {
      method: 'POST',
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(`${action} failed`, { description: j.error });
      return;
    }
    toast.success(`Top-up ${action}d`);
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={() => call('approve')}
        disabled={busy}
        className="rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-paper hover:bg-primary-600 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => call('reject')}
        disabled={busy}
        className="rounded-full border border-line bg-paper px-4 py-1.5 text-xs font-bold text-ink hover:border-ink disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
