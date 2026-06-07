'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowRight } from '@phosphor-icons/react/dist/ssr';

type Line =
  | { type: 'cmd'; text: string }
  | { type: 'log'; text: string; tag?: string }
  | { type: 'success'; text: string }
  | { type: 'json'; text: string };

/** CLI alias from site name — e.g. "Recovero" → "recovero", "ACME Unlock" → "acme-unlock". */
export function toCliAlias(siteName: string): string {
  const slug = siteName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'portal';
}

function buildScript(cliAlias: string, host: string): Line[] {
  return [
    { type: 'cmd', text: `$ ${cliAlias} order:place --service=A.101 --imei=353456789012345` },
    { type: 'log', text: 'validating input · idempotency check · OK', tag: 'INFO' },
    { type: 'log', text: 'wallet.debit $5.99 · ledger entry #2841', tag: 'WALLET' },
    { type: 'cmd', text: `$ POST ${host}/api/index.php action=placeorder` },
    { type: 'json', text: '{ "STATUS": "SUCCESS", "ID": "987654" }' },
    { type: 'log', text: 'order#A1B2C3 → SUBMITTED · external 987654', tag: 'OK' },
    { type: 'cmd', text: `$ ${cliAlias} poll-imei-orders · cycle=42` },
    { type: 'log', text: 'GET getstatus id=987654 → "Completed"', tag: 'POLL' },
    { type: 'success', text: 'Result delivered · UNLK-7341-289X-22' },
  ];
}

const TYPE_SPEED = 12; // ms per char
const LINE_GAP = 250; // ms between lines

type ConsoleLogProps = {
  siteName: string;
  host?: string;
};

export function ConsoleLog({ siteName, host }: ConsoleLogProps) {
  const cliAlias = toCliAlias(siteName);
  const consoleTitle = `${cliAlias} · production`;
  const script = React.useMemo(
    () => buildScript(cliAlias, host ?? 'localhost'),
    [cliAlias, host],
  );

  const [visibleLines, setVisibleLines] = React.useState(0);
  const [typedChars, setTypedChars] = React.useState(0);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    setVisibleLines(0);
    setTypedChars(0);
    setDone(false);
  }, [script]);

  React.useEffect(() => {
    if (visibleLines >= script.length) {
      setDone(true);
      // Loop after a pause
      const restart = setTimeout(() => {
        setVisibleLines(0);
        setTypedChars(0);
        setDone(false);
      }, 4000);
      return () => clearTimeout(restart);
    }
    const current = script[visibleLines];
    if (typedChars < current.text.length) {
      const t = setTimeout(() => setTypedChars((c) => c + 1), TYPE_SPEED);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setVisibleLines((v) => v + 1);
        setTypedChars(0);
      }, LINE_GAP);
      return () => clearTimeout(t);
    }
  }, [visibleLines, typedChars, script]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        <span>Fig. 02 — Live API console</span>
        <span className="flex items-center gap-1.5">
          <span className="live-dot" />
          streaming
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink/20 bg-ink shadow-card-hover">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-paper/10 bg-paper/[0.04] px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">
            {consoleTitle}
          </span>
          <span className="font-mono text-[10px] tabular-nums text-paper/50">
            {String(visibleLines).padStart(2, '0')} / {script.length}
          </span>
        </div>

        {/* Console body */}
        <div className="relative h-[440px] overflow-hidden bg-ink p-5 font-mono text-[12px] leading-[1.7]">
          {/* Subtle scan line */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-primary-500/[0.04] to-transparent"
            animate={{ y: ['-100%', '500%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />

          <AnimatePresence>
            {script.slice(0, visibleLines + 1).map((line, idx) => {
              const isActive = idx === visibleLines && !done;
              const display = isActive ? line.text.slice(0, typedChars) : line.text;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-baseline gap-3"
                >
                  <span className="font-mono text-[10px] tabular-nums text-paper/30">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <ConsoleLine line={{ ...line, text: display }} active={isActive} />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Cursor at bottom when done */}
          {done && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 flex items-center gap-2 text-emerald-400"
            >
              <CheckCircle weight="fill" size={14} />
              <span className="text-[11px]">Cycle complete · restarting in 4s</span>
            </motion.div>
          )}
        </div>

        {/* Footer with status indicators */}
        <div className="flex items-center justify-between border-t border-paper/10 bg-paper/[0.03] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/50">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            All systems operational
          </span>
          <span className="hidden sm:inline">60s polling cadence · auto-refund enabled</span>
        </div>
      </div>

      {/* Floating annotation (shared visual language with ticket) */}
      <motion.div
        initial={{ opacity: 0, x: 10, rotate: 4 }}
        animate={{ opacity: 1, x: 0, rotate: 4 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute -right-2 -top-6 hidden lg:block"
      >
        <div className="rounded-md bg-amber-400 px-3 py-1.5 font-serif text-xs italic text-ink shadow-card-hover">
          ← real production logs
        </div>
      </motion.div>

      {/* Floating tag */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8 }}
        className="absolute -bottom-4 left-6 hidden md:block"
      >
        <div className="flex items-center gap-2 rounded-full border border-line bg-paper-50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted shadow-card">
          <ArrowRight weight="bold" size={10} />
          throughput · 4.2 req/s
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConsoleLine({ line, active }: { line: Line; active: boolean }) {
  const cursor = active ? <Cursor /> : null;
  switch (line.type) {
    case 'cmd':
      return (
        <span className="text-paper">
          <span className="text-amber-400">{line.text.slice(0, 1)}</span>
          {line.text.slice(1)}
          {cursor}
        </span>
      );
    case 'log':
      return (
        <span className="flex items-baseline gap-2 text-paper/70">
          {line.tag && (
            <span className="rounded bg-primary-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300">
              {line.tag}
            </span>
          )}
          <span>{line.text}</span>
          {cursor}
        </span>
      );
    case 'json':
      return (
        <span className="text-cyan-300">
          {line.text}
          {cursor}
        </span>
      );
    case 'success':
      return (
        <span className="flex items-baseline gap-2 text-emerald-400">
          <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
            SUCCESS
          </span>
          <span className="font-bold">{line.text}</span>
          {cursor}
        </span>
      );
  }
}

function Cursor() {
  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="ml-0.5 inline-block h-3 w-1.5 translate-y-[1px] bg-paper/80 align-middle"
    />
  );
}
