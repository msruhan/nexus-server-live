'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { List, X, ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';

type Item = { id: string; label: string; href: string; isExternal: boolean };

export function NavbarClient({
  items,
  siteName,
  tagline,
  logoUrl,
}: {
  items: Item[];
  siteName: string;
  tagline: string;
  logoUrl?: string | null;
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
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-muted">
                {tagline}
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {items.map((l, i) => (
              <Link
                key={l.id}
                href={l.href}
                target={l.isExternal ? '_blank' : undefined}
                rel={l.isExternal ? 'noreferrer' : undefined}
                className="group relative rounded-full px-3.5 py-1.5 text-[13px] font-medium text-ink/70 transition-colors hover:text-ink"
              >
                <span className="mr-2 font-mono text-[10px] text-ink-soft">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-ink/80 transition-colors hover:text-ink sm:inline-block"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="group hidden items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-primary-600 sm:inline-flex"
            >
              Open account
              <ArrowUpRight
                weight="bold"
                size={12}
                className="transition-transform duration-200 group-hover:rotate-45"
              />
            </Link>
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
              {items.map((l, i) => (
                <Link
                  key={l.id}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 border-b border-line py-3 text-base font-medium text-ink last:border-0 hover:text-primary-600"
                >
                  <span className="font-mono text-xs text-ink-soft">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {l.label}
                </Link>
              ))}
              <div className="mt-4 grid gap-2">
                <Link
                  href="/login"
                  className="rounded-full border border-line py-2.5 text-center text-sm font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-ink py-2.5 text-center text-sm font-semibold text-paper"
                >
                  Open account
                </Link>
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
