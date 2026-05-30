'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export type UserGroupOption = { id: string; name: string };

export function UserGroupSelect({
  userId,
  value,
  groups,
}: {
  userId: string;
  value: string | null;
  groups: UserGroupOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [current, setCurrent] = React.useState(value ?? '');

  React.useEffect(() => setCurrent(value ?? ''), [value]);

  async function onChange(next: string) {
    const priceGroupId = next === '' ? null : next;
    setCurrent(next);
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}/price-group`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceGroupId }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to update group', { description: json.error });
      setCurrent(value ?? '');
      return;
    }
    toast.success(priceGroupId ? 'User group updated' : 'User set to retail pricing');
    router.refresh();
  }

  return (
    <select
      value={current}
      onChange={(e) => void onChange(e.target.value)}
      disabled={busy}
      className="max-w-[180px] rounded-lg border border-line bg-paper px-2 py-1.5 text-xs font-medium text-ink disabled:opacity-60"
    >
      <option value="">Retail (no group)</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  );
}
