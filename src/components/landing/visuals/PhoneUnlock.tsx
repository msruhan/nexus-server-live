'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  LockOpen,
  CheckCircle,
  WifiHigh,
  BatteryFull,
  CellSignalHigh,
  Lightning,
} from '@phosphor-icons/react/dist/ssr';

const STAGES = ['scanning', 'submitting', 'processing', 'unlocked'] as const;
type Stage = (typeof STAGES)[number];

const STAGE_DURATION = 2400;

export function PhoneUnlock() {
  const [stageIdx, setStageIdx] = React.useState(0);
  const stage: Stage = STAGES[stageIdx];

  React.useEffect(() => {
    const t = setTimeout(() => {
      setStageIdx((i) => (i + 1) % STAGES.length);
    }, STAGE_DURATION);
    return () => clearTimeout(t);
  }, [stageIdx]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        <span>Fig. 04 — Live unlock simulation</span>
        <span className="flex items-center gap-1.5">
          <span className="live-dot" />
          {stage}
        </span>
      </div>

      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line bg-paper shadow-card-hover">
        {/* Background gradient that shifts with stage */}
        <motion.div
          aria-hidden
          className="absolute inset-0"
          animate={{
            background:
              stage === 'unlocked'
                ? 'radial-gradient(circle at 50% 50%, rgb(var(--primary-100)) 0%, rgb(var(--paper)) 70%)'
                : 'radial-gradient(circle at 50% 30%, rgb(var(--paper-100)) 0%, rgb(var(--paper)) 80%)',
          }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 blueprint opacity-50" />

        {/* Floating particles when unlocked */}
        <AnimatePresence>
          {stage === 'unlocked' && (
            <>
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full bg-primary-500"
                  initial={{
                    opacity: 0,
                    x: '50%',
                    y: '55%',
                    scale: 0,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: `${50 + (Math.cos((i / 12) * Math.PI * 2) * 80)}%`,
                    y: `${55 + (Math.sin((i / 12) * Math.PI * 2) * 80)}%`,
                    scale: [0, 1, 0],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Phone mockup centered */}
        <div className="relative flex h-full items-center justify-center p-6">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <PhoneFrame stage={stage} />
          </motion.div>
        </div>

        {/* Stage progress indicator at bottom */}
        <div className="absolute inset-x-6 bottom-6">
          <div className="flex items-center justify-between border-b border-line pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            <span>Progress</span>
            <span>{stageIdx + 1} / {STAGES.length}</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {STAGES.map((s, i) => (
              <div
                key={s}
                className="h-1 overflow-hidden rounded-full bg-line"
              >
                {i <= stageIdx && (
                  <motion.div
                    initial={{ width: i < stageIdx ? '100%' : '0%' }}
                    animate={{ width: '100%' }}
                    transition={{
                      duration: i === stageIdx ? STAGE_DURATION / 1000 : 0,
                      ease: 'linear',
                    }}
                    className="h-full bg-ink"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink">
            <Lightning weight="fill" size={11} />
            <AnimatePresence mode="wait">
              <motion.span
                key={stage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
              >
                {stageLabel(stage)}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Annotation */}
      <motion.div
        initial={{ opacity: 0, x: 10, rotate: 4 }}
        animate={{ opacity: 1, x: 0, rotate: 4 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute -right-2 -top-6 hidden lg:block"
      >
        <div className="rounded-md bg-amber-400 px-3 py-1.5 font-serif text-xs italic text-ink shadow-card-hover">
          ← median 02:14
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8 }}
        className="absolute -bottom-4 left-6 hidden md:block"
      >
        <div className="flex items-center gap-2 rounded-full border border-line bg-paper-50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted shadow-card">
          <CheckCircle weight="fill" size={10} />
          all carriers · 200+
        </div>
      </motion.div>
    </motion.div>
  );
}

function stageLabel(s: Stage): string {
  switch (s) {
    case 'scanning':
      return 'Scanning IMEI · validating against upstream';
    case 'submitting':
      return 'Submitting docket to DhruFusion';
    case 'processing':
      return 'In process · polling every 60 seconds';
    case 'unlocked':
      return 'Result delivered · UNLK-7341-289X-22';
  }
}

// ─── Phone frame ───────────────────────────────────────────
function PhoneFrame({ stage }: { stage: Stage }) {
  return (
    <div className="relative h-[420px] w-[210px] overflow-hidden rounded-[40px] border-[6px] border-ink bg-ink shadow-card-hover">
      {/* Notch */}
      <div className="absolute left-1/2 top-1.5 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" />

      {/* Status bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-2 font-mono text-[9px] font-bold text-paper">
        <span>9:41</span>
        <span className="flex items-center gap-1.5 opacity-80">
          <CellSignalHigh weight="fill" size={10} />
          <WifiHigh weight="fill" size={10} />
          <BatteryFull weight="fill" size={11} />
        </span>
      </div>

      {/* Screen content */}
      <div className="relative h-full w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {stage === 'scanning' && <ScanningScreen key="scan" />}
          {stage === 'submitting' && <SubmittingScreen key="submit" />}
          {stage === 'processing' && <ProcessingScreen key="process" />}
          {stage === 'unlocked' && <UnlockedScreen key="unlock" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Screens ───────────────────────────────────────────────

function Screen({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className={`absolute inset-0 flex flex-col items-center justify-center px-5 pb-8 pt-12 text-paper ${className}`}
    >
      {children}
    </motion.div>
  );
}

function ScanningScreen() {
  return (
    <Screen className="bg-gradient-to-b from-[#1a1d2e] to-ink">
      <Lock weight="fill" size={36} className="text-paper/70" />
      <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/50">
        Scanning IMEI
      </div>
      <div className="mt-4 w-full overflow-hidden rounded-md bg-paper/10 px-2 py-2">
        <motion.div
          initial={{ x: '0%' }}
          animate={{ x: ['-100%', '110%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="flex gap-1"
        >
          {'353456789012345'.split('').map((d, i) => (
            <span key={i} className="font-mono text-[9px] font-bold text-paper">
              {d}
            </span>
          ))}
        </motion.div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, delay: i * 0.08, repeat: Infinity }}
            className="h-1 w-4 rounded-full bg-primary-400"
          />
        ))}
      </div>
      <div className="mt-auto font-serif text-[10px] italic text-paper/60">
        Validating with upstream…
      </div>
    </Screen>
  );
}

function SubmittingScreen() {
  return (
    <Screen className="bg-gradient-to-b from-[#1a2640] to-ink">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        <Lightning weight="fill" size={36} className="text-primary-300" />
      </motion.div>
      <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/60">
        Submitting
      </div>
      <div className="mt-1 font-display text-base font-extrabold text-paper">
        Wallet · debited
      </div>
      <div className="mt-3 w-full rounded-md border border-paper/15 bg-paper/[0.05] p-3">
        <div className="font-mono text-[9px] uppercase tracking-wider text-paper/40">
          Charge
        </div>
        <div className="font-display text-lg font-bold text-paper">$5.99</div>
      </div>
      <div className="mt-3 flex gap-1.5">
        <motion.span
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          className="h-1.5 w-1.5 rounded-full bg-primary-400"
        />
        <motion.span
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          className="h-1.5 w-1.5 rounded-full bg-primary-400"
        />
        <motion.span
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          className="h-1.5 w-1.5 rounded-full bg-primary-400"
        />
      </div>
      <div className="mt-auto font-mono text-[9px] uppercase tracking-wider text-paper/40">
        POST · placeorder
      </div>
    </Screen>
  );
}

function ProcessingScreen() {
  return (
    <Screen className="bg-gradient-to-b from-[#202848] to-ink">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 32 32" className="h-9 w-9">
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="rgb(var(--primary-300))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="40 100"
          />
        </svg>
      </motion.div>
      <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/60">
        In process
      </div>
      <div className="mt-1 text-center font-display text-base font-extrabold leading-tight text-paper">
        Polling upstream
      </div>
      <div className="mt-4 w-full space-y-1.5">
        {[
          { time: '14:22:01', label: 'Submitted', done: true },
          { time: '14:22:09', label: 'Acknowledged', done: true },
          { time: '14:23:44', label: 'In process', done: false },
        ].map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center gap-2"
          >
            <span
              className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full ${
                row.done ? 'bg-paper text-ink' : 'bg-primary-400'
              }`}
            >
              {row.done && (
                <svg width="6" height="6" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5l3 3 5-7" stroke="currentColor" strokeWidth="2" />
                </svg>
              )}
            </span>
            <span className="font-mono text-[8px] tabular-nums text-paper/40">{row.time}</span>
            <span className="text-[9px] text-paper/80">{row.label}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-auto font-mono text-[9px] uppercase tracking-wider text-paper/40">
        cron · cycle 42
      </div>
    </Screen>
  );
}

function UnlockedScreen() {
  return (
    <Screen className="bg-gradient-to-b from-primary-700 to-primary-900">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
      >
        <LockOpen weight="fill" size={42} className="text-paper" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-3 font-mono text-[9px] uppercase tracking-[0.2em] text-paper/70"
      >
        Unlocked
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mt-2 text-center font-display text-base font-black leading-tight text-paper"
      >
        Result delivered
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 18 }}
        className="mt-4 w-full rounded-md border-2 border-dashed border-paper/40 bg-paper/10 p-3 backdrop-blur-sm"
      >
        <div className="font-mono text-[9px] uppercase tracking-wider text-paper/60">
          Unlock code
        </div>
        <div className="mt-1 font-mono text-[12px] font-bold tracking-wider text-paper">
          UNLK-7341-289X-22
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="mt-auto flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-paper/70"
      >
        <CheckCircle weight="fill" size={10} />
        Duration · 02:14
      </motion.div>
    </Screen>
  );
}
