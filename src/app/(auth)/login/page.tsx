import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <div>
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
        § Sign in
      </span>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink lg:text-5xl">
        Welcome <span className="font-serif italic font-normal">back</span>.
      </h1>
      <p className="mt-3 font-serif text-base italic text-ink-muted">
        Sign in to continue on the platform.
      </p>

      <div className="mt-10">
        <Suspense fallback={<div className="font-mono text-xs text-ink-muted">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
