'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { ArrowUpRight, User, Envelope, LockKey } from '@phosphor-icons/react/dist/ssr';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name')),
      email: String(fd.get('email')),
      password: String(fd.get('password')),
    };

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Registration failed');
      setLoading(false);
      toast.error('Registration failed');
      return;
    }

    // Auto sign-in
    await signIn('credentials', {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });

    toast.success('Account created', { description: 'Welcome to the platform.' });
    router.push('/user/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Input
        name="name"
        label="Full name"
        placeholder="Andre Kurniawan"
        prefix={<User size={16} />}
        required
      />
      <Input
        type="email"
        name="email"
        label="Email"
        placeholder="you@example.com"
        prefix={<Envelope size={16} />}
        required
      />
      <Input
        type="password"
        name="password"
        label="Password"
        placeholder="At least 8 characters"
        prefix={<LockKey size={16} />}
        minLength={8}
        required
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Creating account…' : 'Open account'}
        {!loading && <ArrowUpRight weight="bold" size={14} />}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Already have one?{' '}
        <Link href="/login" className="font-medium text-ink hover:text-primary-600">
          Sign in
        </Link>
      </p>
    </form>
  );
}
