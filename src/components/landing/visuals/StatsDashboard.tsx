'use client';

import * as React from 'react';
import { motion, animate } from 'framer-motion';
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
      <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        <span>Fig. 03 — Live performance dashboard</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="live-dot" />
          updating
        </span>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-line bg-paper-50 shadow-card-hover">
        <div className="absolute inset-0 blueprint opacity-40" />

        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 z-0 h-48 w-48 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgb(var(--primary-500) / 0.12), transparent)' }}
          animate={{ x: [0, 16, 0], y: [0, 12, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 z-0 h-40 w-40 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgb(var(--accent-500) / 0.1), transparent)' }}
          animate={{ x: [0, -12, 0], y: [0, -16, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 flex flex-col gap-3 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <SuccessRing />
            <RevenueTile />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <ActivityFeed />
            <div className="flex flex-col gap-3 sm:col-span-2">
              <AverageDeliveryTile />
              <PendingTile />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/80 pt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Lightning weight="fill" size={10} />
              real metrics · last 24h
            </span>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-900">
              updates every 60s
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SuccessRing() {
  const target = 98.7;
  const [display, setDisplay] = React.useState('0.0');
  const [pct, setPct] = React.useState(0);

  React.useEffect(() => {
    const controls = animate(0, target, {
      duration: 1.8,
      delay: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        setDisplay(v.toFixed(1));
        setPct(v);
      },
    });
    return controls.stop;
  }, []);

  const circumference = 2 * Math.PI * 54;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-paper p-4 shadow-card sm:col-span-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Success rate · 30d
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-200">
          <ArrowUp weight="bold" size={9} /> 0.4%
        </span>
      </div>

      <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex h-[132px] w-[132px] shrink-0 items-center justify-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
            <circle cx="60" cy="60" r="54" stroke="rgb(var(--line))" strokeWidth="8" fill="none" />
            <motion.circle
              cx="60"
              cy="60"
              r="54"
              stroke="rgb(var(--primary-500))"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${dash} ${circumference}`}
            />
          </svg>
          <div className="text-center">
            <div className="font-display text-[34px] font-black leading-none tracking-tightest tabular-nums text-ink">
              {display}
              <span className="text-lg text-ink-muted">%</span>
            </div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted">
              closed successful
            </div>
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 sm:max-w-[240px]">
          {[
            { label: 'Total', value: '4.1K' },
            { label: 'Success', value: '4.0K' },
            { label: 'Refund', value: '54' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-paper-100 px-2 py-2 text-center">
              <div className="font-display text-sm font-extrabold tabular-nums text-ink">{s.value}</div>
              <div className="whitespace-nowrap font-mono text-[8px] uppercase tracking-wider text-ink-muted">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueTile() {
  const target = 12_400;
  const [display, setDisplay] = React.useState('$0');

  React.useEffect(() => {
    const controls = animate(0, target, {
      duration: 1.8,
      delay: 1.0,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        setDisplay(
          new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 1,
          }).format(v),
        );
      },
    });
    return controls.stop;
  }, []);

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
    <div className="flex min-h-[180px] flex-col rounded-2xl border border-primary-700 bg-primary-500 p-4 text-paper shadow-glow-blue sm:col-span-2">
      <div className="flex items-center gap-1.5">
        <Wallet weight="duotone" size={14} />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/80">
          Revenue · 24h
        </span>
      </div>

      <div className="mt-3 min-w-0">
        <div
          className="font-display text-2xl font-black leading-tight tabular-nums sm:text-3xl"
          title="$12,400.00"
        >
          {display}
        </div>
        <div className="mt-0.5 font-mono text-[9px] text-paper/60">$12,400.00 full</div>
      </div>

      <div className="mt-auto pt-3">
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-full">
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--paper))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(var(--paper))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={`${path} L 100 100 L 0 100 Z`}
            fill="url(#spark)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
        <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-paper/80">
          <ArrowUp weight="bold" size={10} />
          +18.2% vs yesterday
        </div>
      </div>
    </div>
  );
}

const ACTIVITY = [
  { name: 'James', service: 'FRP bypass', delta: 12 },
  { name: 'Maria', service: 'T-Mobile unlock', delta: 38 },
  { name: 'David', service: 'iCloud removal', delta: 64 },
  { name: 'Emily', service: 'Mi Account remove', delta: 102 },
  { name: 'Ryan', service: 'Premium check', delta: 145 },
  { name: 'Chris', service: 'Sprint unlock', delta: 188 },
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
    <div className="flex flex-col rounded-2xl border border-line bg-paper p-4 shadow-card sm:col-span-3">
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
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2.5 rounded-lg bg-paper-100 px-3 py-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[11px] font-bold text-paper">
              {item.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold leading-snug text-ink">
                <span className="whitespace-nowrap">{item.name}</span>
                <span className="font-normal text-ink-muted"> · {item.service}</span>
              </div>
              <div className="font-mono text-[9px] text-ink-soft">
                {idx === 0 ? 'just now' : `${item.delta}s ago`}
              </div>
            </div>
            <CheckCircle
              weight="fill"
              size={14}
              className={`shrink-0 ${idx === 0 ? 'text-amber-500' : 'text-primary-500'}`}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AverageDeliveryTile() {
  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-line bg-paper p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <Lightning weight="duotone" size={14} className="text-primary-700" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Median delivery
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <CountUpInline target={2} duration={1.2} />
        <span className="font-mono text-xs text-ink-muted">min</span>
        <CountUpInline target={14} duration={1.4} delay={0.3} />
        <span className="font-mono text-xs text-ink-muted">sec</span>
      </div>

      <div className="mt-3 space-y-1.5">
        {[
          { label: 'Network unlock', value: 78 },
          { label: 'FRP bypass', value: 92 },
          { label: 'iCloud removal', value: 18 },
        ].map((row, i) => (
          <div key={row.label}>
            <div className="mb-0.5 flex items-baseline justify-between font-mono text-[8px] uppercase tracking-wider text-ink-muted">
              <span className="truncate pr-2">{row.label}</span>
              <span className="shrink-0 text-ink">{row.value}%</span>
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
    <span className="font-display text-2xl font-black tabular-nums text-ink">
      {display}
      {suffix}
    </span>
  );
}

function PendingTile() {
  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <TrendUp weight="duotone" size={14} className="text-amber-700" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-800">
          In flight
        </span>
      </div>
      <div className="mt-2">
        <CountUpInline target={42} duration={1.2} />
      </div>
      <p className="mt-1 text-[11px] leading-snug text-amber-900/75">
        Polling every 60s. Auto-refund on rejection.
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-1 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.0 + i * 0.06 }}
            className="h-1.5 w-5 rounded-full bg-amber-400"
          />
        ))}
        <span className="font-mono text-[8px] uppercase tracking-wider text-amber-800">
          + 34 more
        </span>
      </div>
    </div>
  );
}
