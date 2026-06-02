'use client';

import * as React from 'react';
import { motion, animate, useMotionValue } from 'framer-motion';
import {
  CheckCircle,
  TrendUp,
  Lightning,
  Wallet,
  ArrowUp,
} from '@phosphor-icons/react/dist/ssr';

export function StatsDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        <span>Fig. 03 — Live performance dashboard</span>
        <span className="flex items-center gap-1.5">
          <span className="live-dot" />
          updating
        </span>
      </div>

      {/* Container */}
      <div className="relative">
        {/* Grid bg */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line bg-paper-50 shadow-card-hover sm:aspect-[5/5]">
          <div className="absolute inset-0 blueprint opacity-50" />

          {/* Floating ambient blob */}
          <motion.div
            aria-hidden
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgb(var(--primary-500) / 0.18), transparent)' }}
            animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgb(var(--accent-500) / 0.15), transparent)' }}
            animate={{ x: [0, -20, 0], y: [0, -30, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Stat layout */}
          <div className="relative grid h-full grid-cols-6 grid-rows-6 gap-3 p-5">
            {/* Big success ring (col-span-3 row-span-3) */}
            <SuccessRing />

            {/* Revenue tile */}
            <RevenueTile />

            {/* Activity feed */}
            <ActivityFeed />

            {/* Average delivery */}
            <AverageDeliveryTile />

            {/* Pending count badge */}
            <PendingTile />
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
            ← updates every 60 seconds
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="absolute -bottom-4 left-6 hidden md:block"
        >
          <div className="flex items-center gap-2 rounded-full border border-line bg-paper-50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted shadow-card">
            <Lightning weight="fill" size={10} />
            real metrics · last 24h
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Big success ring ──────────────────────────────────────
function SuccessRing() {
  const target = 98.7;
  const mv = useMotionValue(0);
  const [display, setDisplay] = React.useState('0.0');
  const [pct, setPct] = React.useState(0);

  React.useEffect(() => {
    const controls = animate(mv, target, {
      duration: 1.8,
      delay: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        setDisplay(v.toFixed(1));
        setPct(v);
      },
    });
    return controls.stop;
  }, [mv]);

  const circumference = 2 * Math.PI * 70;
  const dash = (pct / 100) * circumference;

  return (
    <div className="col-span-4 row-span-3 flex flex-col rounded-2xl border border-line bg-paper p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Success rate · 30d
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-200">
          <ArrowUp weight="bold" size={9} /> 0.4%
        </span>
      </div>

      <div className="relative mx-auto my-2 flex h-[170px] w-[170px] items-center justify-center">
        <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
          <circle cx="80" cy="80" r="70" stroke="rgb(var(--line))" strokeWidth="10" fill="none" />
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            stroke="rgb(var(--primary-500))"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ filter: 'drop-shadow(0 4px 12px rgb(var(--primary-500) / 0.4))' }}
          />
        </svg>
        <div className="text-center">
          <div className="font-display text-[42px] font-black leading-none tracking-tightest tabular-nums text-ink">
            {display}
            <span className="text-2xl text-ink-muted">%</span>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            closed successful
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        {[
          { label: 'Total', value: '4,128' },
          { label: 'Success', value: '4,074' },
          { label: 'Refund', value: '54' },
        ].map((s) => (
          <div key={s.label}>
            <div className="font-display text-base font-extrabold tabular-nums text-ink">
              {s.value}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Revenue tile ──────────────────────────────────────────
function RevenueTile() {
  const target = 12_400_000;
  const [display, setDisplay] = React.useState('0');

  React.useEffect(() => {
    const mv = { v: 0 };
    const controls = animate(0, target, {
      duration: 1.8,
      delay: 1.0,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        setDisplay(new Intl.NumberFormat('en-US').format(Math.round(v)));
      },
    });
    return controls.stop;
  }, []);

  // Mini sparkline data
  const points = [10, 14, 12, 18, 16, 22, 19, 24, 28, 26, 32, 34];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - ((p - min) / (max - min)) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="col-span-2 row-span-3 flex flex-col rounded-2xl border border-primary-700 bg-primary-500 p-4 text-paper shadow-glow-blue">
      <div className="flex items-center gap-1.5">
        <Wallet weight="duotone" size={14} />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/80">
          Revenue · 24h
        </span>
      </div>

      <div className="mt-3 font-serif text-sm italic text-paper/70">Rp</div>
      <div className="mt-1 font-display text-[clamp(1.5rem,3vw,2rem)] font-black leading-none tabular-nums">
        {display}
      </div>

      <div className="mt-auto">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-16 w-full">
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--paper))" stopOpacity="0.45" />
              <stop offset="100%" stopColor="rgb(var(--paper))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={`${path} L 100 100 L 0 100 Z`}
            fill="url(#spark)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 1.2, duration: 1.2 }}
          />
          <motion.path
            d={path}
            fill="none"
            stroke="rgb(var(--paper))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1.2, duration: 1.4 }}
          />
        </svg>
        <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-paper/80">
          <ArrowUp weight="bold" size={10} />
          +18.2% vs yesterday
        </div>
      </div>
    </div>
  );
}

// ─── Activity feed ─────────────────────────────────────────
const ACTIVITY = [
  { name: 'Andre', service: 'iCloud removal', delta: 12 },
  { name: 'Sari', service: 'T-Mobile unlock', delta: 38 },
  { name: 'Rudi', service: 'FRP bypass', delta: 64 },
  { name: 'Dimas', service: 'Mi Account remove', delta: 102 },
  { name: 'Rina', service: 'Premium check', delta: 145 },
  { name: 'Budi', service: 'Sprint unlock', delta: 188 },
];

function ActivityFeed() {
  const [items, setItems] = React.useState(ACTIVITY.slice(0, 3));
  const [cursor, setCursor] = React.useState(3);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) => {
        const newItem = ACTIVITY[cursor % ACTIVITY.length];
        return [{ ...newItem, delta: 0 }, ...prev.slice(0, 2)];
      });
      setCursor((c) => c + 1);
    }, 2400);
    return () => clearInterval(interval);
  }, [cursor]);

  return (
    <div className="col-span-4 row-span-3 flex flex-col rounded-2xl border border-line bg-paper p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Live activity
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          live
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <motion.div
            key={`${item.name}-${cursor}-${idx}`}
            initial={{ opacity: 0, x: -16, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 rounded-lg bg-paper-100 px-3 py-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[11px] font-bold text-paper">
              {item.name[0]}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-bold text-ink">
                {item.name} · <span className="font-normal text-ink-muted">{item.service}</span>
              </div>
              <div className="font-mono text-[9px] text-ink-soft">
                {idx === 0 ? 'just now' : `${item.delta}s ago`}
              </div>
            </div>
            <CheckCircle
              weight="fill"
              size={14}
              className={idx === 0 ? 'text-amber-500' : 'text-primary-500'}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Average delivery tile ─────────────────────────────────
function AverageDeliveryTile() {
  return (
    <div className="col-span-3 row-span-3 flex flex-col rounded-2xl border border-line bg-paper p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <Lightning weight="duotone" size={14} className="text-primary-700" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Median delivery
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <CountUpInline target={2} suffix="" duration={1.2} />
        <span className="font-mono text-sm text-ink-muted">min</span>
        <CountUpInline target={14} suffix="" duration={1.4} delay={0.3} />
        <span className="font-mono text-sm text-ink-muted">sec</span>
      </div>

      <div className="mt-auto space-y-1.5">
        {[
          { label: 'Network unlock', value: 78 },
          { label: 'FRP bypass', value: 92 },
          { label: 'iCloud removal', value: 18 },
        ].map((row, i) => (
          <div key={row.label}>
            <div className="mb-0.5 flex items-baseline justify-between font-mono text-[9px] uppercase tracking-wider text-ink-muted">
              <span>{row.label}</span>
              <span className="text-ink">{row.value}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full bg-primary-500"
                initial={{ width: '0%' }}
                animate={{ width: `${row.value}%` }}
                transition={{ duration: 1, delay: 0.8 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountUpInline({
  target,
  suffix = '',
  duration = 1.4,
  delay = 0,
}: {
  target: number;
  suffix?: string;
  duration?: number;
  delay?: number;
}) {
  const [display, setDisplay] = React.useState('0');
  React.useEffect(() => {
    const controls = animate(0, target, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(String(Math.round(v))),
    });
    return controls.stop;
  }, [target, duration, delay]);
  return (
    <span className="font-display text-3xl font-black tabular-nums text-ink">
      {display}
      {suffix}
    </span>
  );
}

// ─── Pending count tile ────────────────────────────────────
function PendingTile() {
  return (
    <motion.div
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className="col-span-3 row-span-3 flex flex-col rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-card"
    >
      <div className="flex items-center gap-1.5">
        <TrendUp weight="duotone" size={14} className="text-amber-700" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-800">
          In flight
        </span>
      </div>
      <div className="mt-3">
        <CountUpInline target={42} duration={1.2} />
      </div>
      <p className="mt-1 font-serif text-xs italic text-amber-900/70">
        Polling every 60 seconds. Auto-refund on rejection.
      </p>
      <div className="mt-auto flex flex-wrap gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.0 + i * 0.06 }}
            className="h-1.5 w-6 rounded-full bg-amber-400"
          />
        ))}
        <span className="ml-1 self-center font-mono text-[9px] uppercase tracking-wider text-amber-800">
          + 34 more
        </span>
      </div>
    </motion.div>
  );
}
