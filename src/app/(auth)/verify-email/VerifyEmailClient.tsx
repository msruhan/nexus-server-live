'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function VerifyEmailClient({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = React.useState('Verifying your email…');

  React.useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setStatus('error');
        setMessage(json.error ?? 'Verification failed');
        return;
      }
      setStatus('success');
      setMessage(
        json.alreadyVerified
          ? 'Your email was already verified. You can sign in.'
          : 'Email verified successfully. You can now sign in.',
      );
    })();
  }, [token]);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-paper-50 p-8 text-center">
      <h1 className="font-display text-2xl font-extrabold text-ink">Email verification</h1>
      <p
        className={`mt-4 text-sm ${
          status === 'error' ? 'text-red-700' : status === 'success' ? 'text-emerald-700' : 'text-ink-muted'
        }`}
      >
        {message}
      </p>
      {status !== 'loading' && (
        <div className="mt-6">
          <Button onClick={() => router.push('/login')}>Go to sign in</Button>
        </div>
      )}
      {status === 'error' && (
        <p className="mt-4 text-xs text-ink-muted">
          Need help? <Link href="/login" className="underline">Contact support via sign in page.</Link>
        </p>
      )}
    </div>
  );
}
