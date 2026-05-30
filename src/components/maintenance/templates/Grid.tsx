'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { GearSix } from '@phosphor-icons/react/dist/ssr';
import { Countdown } from '../Countdown';
import type { MaintenanceViewProps } from '../types';

/**
 * Grid — editorial light template. Warm paper background, animated
 * blueprint grid, rotating gears, ledger-style typography. Matches the
 * site's main design language.
 */
export function Grid({ siteName, title, message, endsAt }: MaintenanceViewProps) {
  const words = title.split(' ');
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfaf6] text-ink">
      {/* Animated drifting grid */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        animate={{ backgroundPosition: ['0px 0px', '48px 48px'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />

      {/* Floating gears top-right */}
      <div aria-hidden className="pointer-events-none absolute right-8 top-8 opacity-[0.08] sm:right-16 sm:top-16">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}>
          <GearSix size={180} weight="fill" />
        </motion.div>
      </div>
      <div aria-hidden className="pointer-events-none absolute right-40 top-40 opacity-[0.06]">
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}>
          <GearSix size={110} weight="fill" />
        </motion.div>
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <span className="h-px w-12 bg-ink/30" />
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-muted">
            {siteName} · § closed for repair
          </span>
        </motion.div>

        <h1 className="mt-8 font-display text-[clamp(2.8rem,9vw,6.5rem)] font-black leading-[0.92] tracking-tight">
          {words.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 30, rotate: 4 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={i === words.length - 1 ? 'font-serif font-normal italic text-primary-600' : ''}
            >
              {w}{' '}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mt-8 max-w-xl font-serif text-xl italic leading-relaxed text-ink-muted"
          dangerouslySetInnerHTML={{ __html: message }}
        />

        {endsAt && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
            className="mt-12"
          >
            <Countdown endsAt={endsAt} tone="light" />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-14 flex items-center gap-3 border-t border-ink/10 pt-6"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-500" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            Systems being upgraded · back shortly
          </span>
        </motion.div>
      </div>
    </main>
  );
}
