'use client';

import { motion } from 'framer-motion';
import { Check, ArrowRight } from '@phosphor-icons/react/dist/ssr';

export function LiveOrderTicket() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Decorative coordinate label */}
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        <span>Fig. 01 — Live order ticket</span>
        <span className="flex items-center gap-1.5">
          <span className="live-dot" />
          observing
        </span>
      </div>

      {/* The ticket card — has perforated edge */}
      <div className="relative">
        {/* Perforated top edge */}
        <Perforation position="top" />

        <div className="relative overflow-hidden rounded-b-md border border-x border-b border-line bg-paper-50 shadow-card-hover">
          {/* Header strip */}
          <div className="flex items-center justify-between border-b border-line bg-paper-100 px-5 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Order Docket
            </span>
            <span className="font-mono text-[10px] tracking-wider text-ink">
              ID-K7VN3P2WXR9M
            </span>
          </div>

          {/* Service line */}
          <div className="border-b border-line px-5 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Service
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <div className="font-display text-base font-bold leading-snug text-ink">
                Samsung Galaxy S24
                <br />
                <span className="font-serif italic font-normal text-ink-muted">
                  T-Mobile USA · network unlock
                </span>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Charge
                </div>
                <div className="font-display text-lg font-extrabold tracking-tight text-ink">
                  $5.99
                </div>
              </div>
            </div>
          </div>

          {/* Device ID row — looks scanned */}
          <div className="border-b border-line px-5 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Device ID
            </div>
            <div className="mt-1 flex items-center gap-3">
              <ScanningNumber digits="3 5 3 4 5 6 7 8 9 0 1 2 3 4 5" />
              <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                clean
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Status timeline
              </span>
              <span className="font-mono text-[10px] text-ink-soft">UTC+07</span>
            </div>
            <Timeline />
          </div>

          {/* Footer with result code emerging */}
          <div className="border-t border-dashed border-line bg-paper-100 px-5 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Result code
            </div>
            <div className="mt-2 flex items-center gap-2">
              <CodeReveal code="UNLK-7341-289X-22" />
              <button className="ml-auto inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-paper hover:bg-primary-600">
                Copy
                <ArrowRight weight="bold" size={10} />
              </button>
            </div>
          </div>
        </div>

        {/* Perforated bottom */}
        <Perforation position="bottom" />
      </div>

      {/* Floating annotation — handwritten note feel */}
      <motion.div
        initial={{ opacity: 0, x: 10, rotate: 4 }}
        animate={{ opacity: 1, x: 0, rotate: 4 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute -right-2 -top-6 hidden lg:block"
      >
        <div className="rounded-md bg-amber-400 px-3 py-1.5 font-serif text-xs italic text-ink shadow-card-hover">
          ← real ticket from the desk
        </div>
      </motion.div>

      {/* Floating tag */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8 }}
        className="absolute -bottom-4 left-6 hidden md:block"
      >
        <div className="rounded-full border border-line bg-paper-50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted shadow-card">
          duration · 02:14
        </div>
      </motion.div>
    </motion.div>
  );
}

function Perforation({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      className={`absolute left-0 right-0 ${
        position === 'top' ? '-top-px' : '-bottom-px'
      } z-10 h-2 overflow-hidden`}
      aria-hidden
    >
      <svg viewBox="0 0 200 8" className="block h-full w-full" preserveAspectRatio="none">
        <pattern id={`perf-${position}`} width="14" height="8" patternUnits="userSpaceOnUse">
          <circle cx="7" cy={position === 'top' ? '0' : '8'} r="3" fill="var(--paper)" />
        </pattern>
        <rect width="100%" height="100%" fill={`url(#perf-${position})`} />
      </svg>
    </div>
  );
}

function ScanningNumber({ digits }: { digits: string }) {
  const arr = digits.split(' ');
  return (
    <div className="relative flex flex-1 gap-1 overflow-hidden rounded-md border border-line bg-paper px-2 py-1.5">
      {arr.map((d, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 + i * 0.04 }}
          className="font-mono text-sm font-bold tabular-nums text-ink"
        >
          {d}
        </motion.span>
      ))}
      {/* scanning line */}
      <span className="pointer-events-none absolute inset-y-0 left-0 right-0">
        <motion.span
          className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary-400/30 to-transparent"
          animate={{ x: ['-50%', '350%'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
        />
      </span>
    </div>
  );
}

function Timeline() {
  const steps = [
    { time: '14:22:01', label: 'Submitted to server', state: 'done' as const },
    { time: '14:22:09', label: 'Acknowledged · ID 987654', state: 'done' as const },
    { time: '14:23:44', label: 'In process', state: 'done' as const },
    { time: '14:24:15', label: 'Result delivered', state: 'active' as const },
  ];

  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 + i * 0.18 }}
          className="flex items-center gap-3"
        >
          <span className="font-mono text-[10px] tabular-nums text-ink-soft">{s.time}</span>
          <span className="h-px flex-1 border-t border-dashed border-line" />
          {s.state === 'done' ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ink text-paper">
              <Check weight="bold" size={9} />
            </span>
          ) : (
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary-400/50" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-primary-500" />
            </span>
          )}
          <span
            className={`min-w-[140px] text-[12px] ${
              s.state === 'done' ? 'text-ink-muted' : 'font-semibold text-ink'
            }`}
          >
            {s.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function CodeReveal({ code }: { code: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2.2 }}
      className="flex-1 rounded-md border-2 border-dashed border-primary-500 bg-primary-50/40 px-3 py-2 font-mono text-sm font-bold tracking-wider text-primary-700"
    >
      {code.split('').map((c, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2 + i * 0.04 }}
          className="inline-block"
        >
          {c === ' ' ? '\u00A0' : c}
        </motion.span>
      ))}
    </motion.div>
  );
}
