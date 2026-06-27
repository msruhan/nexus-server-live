'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  userNeedsEmailVerification,
  userPendingAdminActivation,
} from '@/lib/auth/registration-activation';

export function UserActivationStatus({
  userId,
  active,
  emailVerifiedAt,
  emailVerificationToken,
}: {
  userId: string;
  active: boolean;
  emailVerifiedAt: Date | null;
  emailVerificationToken: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const user = {
    isActive: active,
    emailVerifiedAt,
    emailVerificationToken,
  };

  const pendingEmail = userNeedsEmailVerification(user);
  const pendingAdmin = userPendingAdminActivation(user);

  async function toggleActive() {
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

  if (pendingEmail) {
    return (
      <span className="rounded-full bg-sky-100 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-sky-800">
        Pending email
      </span>
    );
  }

  if (pendingAdmin) {
    return (
      <button
        type="button"
        onClick={() => void toggleActive()}
        disabled={busy}
        className="rounded-full bg-amber-100 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800 hover:bg-amber-200 disabled:opacity-60"
      >
        Pending approval · activate
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggleActive()}
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
