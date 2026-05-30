'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { toast } from 'sonner';
import { ArrowUpRight, Envelope, Key, LockKey } from '@phosphor-icons/react/dist/ssr';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [needs2FA, setNeeds2FA] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [totp, setTotp] = React.useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formEmail = email || String(new FormData(e.currentTarget).get('email') ?? '');
    const formPassword = password || String(new FormData(e.currentTarget).get('password') ?? '');

    if (!needs2FA) {
      const checkRes = await fetch('/api/auth/check-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formEmail, password: formPassword }),
      });
      const checkJson = await checkRes.json().catch(() => ({}));

      if (!checkRes.ok || !checkJson.success) {
        setLoading(false);
        setError(checkJson.error ?? 'Invalid email or password');
        toast.error('Sign in failed', {
          description: checkJson.error ?? 'Check your credentials and try again.',
        });
        return;
      }

      if (checkJson.data?.requires2FA) {
        setEmail(formEmail);
        setPassword(formPassword);
        setNeeds2FA(true);
        setLoading(false);
        return;
      }
    }

    const res = await signIn('credentials', {
      email: formEmail,
      password: formPassword,
      totp: needs2FA ? totp : '',
      redirect: false,
    });

    if (res?.error) {
      setLoading(false);
      const message = needs2FA
        ? 'Invalid Google Authenticator code'
        : 'Invalid email or password';
      setError(message);
      toast.error('Sign in failed', { description: message });
      return;
    }

    let target = next;
    if (!target) {
      const session = await getSession();
      const role = session?.user.role;
      target = role === 'ADMIN' || role === 'SUB_ADMIN' ? '/admin/dashboard' : '/user/dashboard';
    }
    setLoading(false);
    toast.success('Welcome back');
    router.push(target);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {!needs2FA ? (
        <>
          <Input
            type="email"
            name="email"
            label="Email"
            placeholder="you@example.com"
            prefix={<Envelope size={16} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            name="password"
            label="Password"
            placeholder="••••••••"
            prefix={<LockKey size={16} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </>
      ) : (
        <>
          <div className="rounded-lg border border-line bg-paper-100 px-4 py-3 text-sm text-ink-muted">
            <p className="font-medium text-ink">Two-factor verification</p>
            <p className="mt-1">
              Enter the 6-digit code from Google Authenticator, or a backup code (XXXX-XXXX).
            </p>
          </div>
          <Input
            inputMode="numeric"
            name="totp"
            label="Google Authenticator code"
            placeholder="000000"
            prefix={<Key size={16} />}
            value={totp}
            onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            autoFocus
            required
          />
          <button
            type="button"
            className="text-sm text-ink-muted hover:text-ink"
            onClick={() => {
              setNeeds2FA(false);
              setTotp('');
              setError(null);
            }}
          >
            ← Back to email & password
          </button>
        </>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Signing in…' : needs2FA ? 'Verify & sign in' : 'Sign in'}
        {!loading && <ArrowUpRight weight="bold" size={14} />}
      </Button>

      {!needs2FA && (
        <>
          <div className="flex items-center justify-between border-t border-line pt-5 text-sm">
            <Link href="/register" className="font-medium text-ink hover:text-primary-600">
              Open new account →
            </Link>
            <Link href="#" className="text-ink-muted hover:text-ink">
              Forgot password?
            </Link>
          </div>

          <div className="rounded-lg border border-line bg-paper-100 px-4 py-3 font-mono text-[11px] text-ink-muted">
            <div className="font-bold text-ink">Demo credentials</div>
            <div className="mt-1">admin@nexus.id · admin123</div>
            <div>reseller@demo.id · user1234</div>
          </div>
        </>
      )}
    </form>
  );
}
