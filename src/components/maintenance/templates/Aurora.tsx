'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Wrench } from '@phosphor-icons/react/dist/ssr';
import { Countdown } from '../Countdown';
import type { MaintenanceViewProps } from '../types';

/**
 * Aurora — flagship dark template. Animated floating gradient orbs,
 * mesh aurora background, glassmorphic content card, staggered reveal.
 */
export function Aurora({ siteName, title, message, endsAt }: MaintenanceViewProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070a18] text-white">
      {/* Aurora orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-1/4 top-[-20%] h-[60vh] w-[60vh] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.55), transparent 70%)' }}
        animate={{ x: [0, 80, 0], y: [0, 60, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-[-15%] top-[10%] h-[55vh] w-[55vh] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.45), transparent 70%)' }}
        animate={{ x: [0, -70, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[-20%] left-[20%] h-[50vh] w-[50vh] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4), transparent 70%)' }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 21, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Grain / grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="mb-8"
        >
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.06] ring-1 ring-white/15 backdrop-blur-md">
            <motion.div
              animate={{ rotate: [0, -18, 18, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Wrench size={36} weight="fill" className="text-white" />
            </motion.div>
            <motion.span
              className="absolute inset-0 rounded-3xl ring-1 ring-white/20"
              animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50"
        >
          {siteName} · under maintenance
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 font-display text-[clamp(2.6rem,8vw,5.5rem)] font-black leading-[0.95] tracking-tight"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-7 max-w-xl text-lg leading-relaxed text-white/70"
          dangerouslySetInnerHTML={{ __html: message }}
        />

        {endsAt && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="mt-12"
          >
            <Countdown endsAt={endsAt} tone="dark" />
          </motion.div>
        )}

        {/* Animated progress shimmer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12 h-1 w-64 overflow-hidden rounded-full bg-white/10"
        >
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-white to-transparent"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </main>
  );
}
