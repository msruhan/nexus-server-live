'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function UserToggle({ userId, active }: { userId: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function call() {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !active }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error('Update failed');
      return;
    }
    toast.success(`User ${active ? 'deactivated' : 'activated'}`);
    router.refresh();
  }

  return (
    <button
      onClick={call}
      disabled={busy}
      className={`rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
        active
          ? 'border border-line bg-paper text-ink-muted hover:border-ink hover:text-ink'
          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
      }`}
    >
      {active ? 'Active · click to disable' : 'Inactive · click to enable'}
    </button>
  );
}
