'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function PasswordForm() {
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/user/profile/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: String(fd.get('currentPassword')),
        newPassword: String(fd.get('newPassword')),
      }),
    });
    setLoading(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error('Update failed', { description: j.error });
      return;
    }
    toast.success('Password changed');
    (e.target as HTMLFormElement).reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-line bg-paper-50 p-6">
      <Input type="password" name="currentPassword" label="Current password" required />
      <Input type="password" name="newPassword" label="New password" minLength={8} required />
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving…' : 'Update password'}
      </Button>
    </form>
  );
}
