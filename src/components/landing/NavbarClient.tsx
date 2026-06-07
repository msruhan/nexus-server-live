'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { List, X, ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';

type Item = { id: string; label: string; href: string; isExternal: boolean };

export type NavbarAuth =
  | { kind: 'guest' }
  | { kind: 'authenticated'; href: string; label: string; name?: string | null };

function firstName(name?: string | null): string | null {
  if (!name?.trim()) return null;
  return name.trim().split(/\s+/)[0] ?? null;
}

function AuthActions({
  authNav,
  className,
  onNavigate,
}: {
  authNav: NavbarAuth;
  className?: string;
  onNavigate?: () => void;
}) {
  if (authNav.kind === 'guest') {
    return (
      <div className={className}>
        <Link
          href="/login"
          onClick={onNavigate}
          className="hidden text-sm font-medium text-ink/80 transition-colors hover:text-ink sm:inline-block"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          onClick={onNavigate}
          className="group hidden items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-primary-600 sm:inline-flex"
        >
          Open account
          <ArrowUpRight
            weight="bold"
            size={12}
            className="transition-transform duration-200 group-hover:rotate-45"
          />
        </Link>
      </div>
    );
  }

  const greeting = firstName(authNav.name);

  return (
    <div className={className}>
      {greeting ? (
        <span className="hidden text-sm font-medium text-ink/70 sm:inline-block">
          Hi, {greeting}
        </span>
      ) : null}
      <Link
        href={authNav.href}
        onClick={onNavigate}
        className="group inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-primary-600"
      >
        {authNav.label}
        <ArrowUpRight
          weight="bold"
          size={12}
          className="transition-transform duration-200 group-hover:rotate-45"
        />
      </Link>
    </div>
  );
}

export function NavbarClient({
  items,
  siteName,
  tagline,
  logoUrl,
  authNav = { kind: 'guest' },
}: {
  items: Item[];
  siteName: string;
  tagline: string;
  logoUrl?: string | null;
  authNav?: NavbarAuth;
}) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    setScrolled(y > 8);
  });

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          'sticky top-0 z-40 w-full border-b transition-colors duration-300',
          scrolled ? 'border-line bg-paper/80 backdrop-blur-md' : 'border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-9 w-auto max-w-[160px] object-contain" />
            ) : (
              <Logo />
            )}
            <div className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-[15px] font-extrabold tracking-tight text-ink">
                {siteName}
              </span>
              <span className="mt-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-700/70">
                {tagline}
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {items.map((l) => (
              <Link
                key={l.id}
                href={l.href}
                target={l.isExternal ? '_blank' : undefined}
                rel={l.isExternal ? 'noreferrer' : undefined}
                className="group relative rounded-full px-3.5 py-1.5 text-[13px] font-medium text-ink/70 transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <AuthActions authNav={authNav} className="hidden items-center gap-3 sm:flex" />
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink lg:hidden"
              aria-label="Open menu"
            >
              <List weight="bold" size={18} />
            </button>
          </div>
        </div>
      </motion.header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-x-4 top-4 rounded-2xl border border-line bg-paper p-5 shadow-card-hover"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Index
              </span>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line"
              >
                <X weight="bold" size={16} />
              </button>
            </div>
            <div className="flex flex-col">
              {items.map((l) => (
                <Link
                  key={l.id}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 border-b border-line py-3 text-base font-medium text-ink last:border-0 hover:text-primary-600"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-4 grid gap-2">
                {authNav.kind === 'guest' ? (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="rounded-full border border-line py-2.5 text-center text-sm font-medium"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setOpen(false)}
                      className="rounded-full bg-ink py-2.5 text-center text-sm font-semibold text-paper"
                    >
                      Open account
                    </Link>
                  </>
                ) : (
                  <>
                    {firstName(authNav.name) ? (
                      <p className="py-1 text-center text-sm text-ink-muted">
                        Signed in as {firstName(authNav.name)}
                      </p>
                    ) : null}
                    <Link
                      href={authNav.href}
                      onClick={() => setOpen(false)}
                      className="rounded-full bg-ink py-2.5 text-center text-sm font-semibold text-paper"
                    >
                      {authNav.label}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function Logo() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-ink text-paper">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M5 19V5L19 19V5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary-400 ring-2 ring-paper" />
    </span>
  );
}
