'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: String(fd.get('name')) }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error('Update failed');
      return;
    }
    toast.success('Profile updated');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-line bg-paper-50 p-6">
      <Input name="name" label="Full name" defaultValue={initialName} required />
      <Input label="Email" value={email} disabled hint="Email cannot be changed" />
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
