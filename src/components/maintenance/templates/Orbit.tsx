'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Planet } from '@phosphor-icons/react/dist/ssr';
import { Countdown } from '../Countdown';
import type { MaintenanceViewProps } from '../types';

/**
 * Orbit — sci-fi dark template. A glowing core with multiple orbiting
 * rings + particles, radial glow, content below. Heavy on continuous
 * orbital motion.
 */
export function Orbit({ siteName, title, message, endsAt }: MaintenanceViewProps) {
  const rings = [
    { size: 200, duration: 12, dots: 1, color: 'rgba(56,189,248,0.9)' },
    { size: 300, duration: 18, dots: 2, color: 'rgba(168,85,247,0.9)' },
    { size: 420, duration: 26, dots: 3, color: 'rgba(16,185,129,0.9)' },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060c] text-white">
      {/* radial center glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] h-[80vh] w-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.18), transparent 60%)' }}
      />

      {/* Starfield */}
      <Stars />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        {/* Orbit system */}
        <div className="relative mb-4 flex h-[420px] w-[420px] max-w-[90vw] items-center justify-center">
          {rings.map((ring, ri) => (
            <motion.div
              key={ri}
              className="absolute rounded-full border border-white/10"
              style={{ height: ring.size, width: ring.size, maxHeight: '85vw', maxWidth: '85vw' }}
              animate={{ rotate: 360 }}
              transition={{ duration: ring.duration, repeat: Infinity, ease: 'linear' }}
            >
              {Array.from({ length: ring.dots }).map((_, di) => (
                <span
                  key={di}
                  className="absolute h-3 w-3 rounded-full"
                  style={{
                    top: -6,
                    left: `calc(50% - 6px)`,
                    transform: `rotate(${(360 / ring.dots) * di}deg) translateY(${-ring.size / 2}px)`,
                    background: ring.color,
                    boxShadow: `0 0 16px ${ring.color}`,
                  }}
                />
              ))}
            </motion.div>
          ))}

          {/* Core */}
          <motion.div
            className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-600"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ boxShadow: '0 0 60px rgba(56,189,248,0.6)' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <Planet size={44} weight="fill" className="text-white" />
            </motion.div>
          </motion.div>
        </div>

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-mono text-[11px] uppercase tracking-[0.3em] text-sky-300/70"
        >
          {siteName} · system upgrade in progress
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 font-display text-[clamp(2.4rem,7vw,4.5rem)] font-black leading-[0.95] tracking-tight"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-white/60"
          dangerouslySetInnerHTML={{ __html: message }}
        />

        {endsAt && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.7 }}
            className="mt-10"
          >
            <Countdown endsAt={endsAt} tone="dark" />
          </motion.div>
        )}
      </div>
    </main>
  );
}

function Stars() {
  // Deterministic pseudo-random star positions (avoid hydration mismatch).
  const stars = React.useMemo(() => {
    const out: Array<{ top: number; left: number; delay: number; size: number }> = [];
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 60; i++) {
      out.push({ top: rand() * 100, left: rand() * 100, delay: rand() * 3, size: rand() * 2 + 1 });
    }
    return out;
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {stars.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ top: `${s.top}%`, left: `${s.left}%`, height: s.size, width: s.size }}
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: 2.5, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
