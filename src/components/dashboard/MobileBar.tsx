'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { SignOut } from '@phosphor-icons/react/dist/ssr';
import { formatAppVersion } from '@/lib/app-version';

export function MobileBar({ user }: { user: { name: string; email: string; role: string } }) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper px-4 py-3 lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-paper">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path d="M5 19V5L19 19V5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
          </svg>
        </span>
        <div className="leading-tight">
          <span className="font-display text-sm font-extrabold tracking-tight text-ink">Nexus</span>
          <span className="block font-mono text-[9px] tabular-nums text-ink-soft">{formatAppVersion()}</span>
        </div>
      </Link>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono uppercase tracking-wider text-ink-muted">{user.email}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line"
        >
          <SignOut size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
