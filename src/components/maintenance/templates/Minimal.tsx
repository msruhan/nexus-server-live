'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Countdown } from '../Countdown';
import type { MaintenanceViewProps } from '../types';

/**
 * Minimal — clean light template. Lots of whitespace, a single animated
 * progress bar, typographic focus. Subtle and professional.
 */
export function Minimal({ siteName, title, message, endsAt }: MaintenanceViewProps) {
  return (
    <main className="relative grid min-h-screen place-items-center bg-white px-6 text-ink">
      <div className="w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2"
        >
          <motion.span
            className="h-2 w-2 rounded-full bg-primary-500"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-muted">
            {siteName}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 font-display text-4xl font-extrabold tracking-tight sm:text-5xl"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="mt-5 text-lg leading-relaxed text-ink-muted"
          dangerouslySetInnerHTML={{ __html: message }}
        />

        {/* Indeterminate progress bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-10 h-1.5 w-full origin-left overflow-hidden rounded-full bg-ink/[0.06]"
        >
          <motion.div
            className="h-full w-2/5 rounded-full bg-ink"
            animate={{ x: ['-110%', '260%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {endsAt && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="mt-12"
          >
            <Countdown endsAt={endsAt} tone="light" />
          </motion.div>
        )}
      </div>
    </main>
  );
}
