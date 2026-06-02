'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { List, SignOut, X } from '@phosphor-icons/react';
import { formatAppVersion } from '@/lib/app-version';
import { useSidebarMobileNav } from '@/components/dashboard/sidebar-mobile-context';

export function MobileBar({ user }: { user: { name: string; email: string; role: string } }) {
  const { open, toggle } = useSidebarMobileNav();

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-paper px-3 py-3 lg:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-paper-50 text-ink hover:bg-paper-200"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
        </button>
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-paper">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="M5 19V5L19 19V5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
            </svg>
          </span>
          <div className="min-w-0 leading-tight">
            <span className="block truncate font-display text-sm font-extrabold tracking-tight text-ink">
              Nexus
            </span>
            <span className="block font-mono text-[9px] tabular-nums text-ink-soft">{formatAppVersion()}</span>
          </div>
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="hidden max-w-[120px] truncate font-mono text-[10px] uppercase tracking-wider text-ink-muted sm:inline">
          {user.email}
        </span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line"
          aria-label="Sign out"
        >
          <SignOut size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
