'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Unit = { label: string; value: number };

function diff(target: number) {
  const now = Date.now();
  const ms = Math.max(0, target - now);
  const totalSec = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    done: ms <= 0,
  };
}

/**
 * Animated countdown. Each digit flips with a spring when it changes.
 * `tone` controls colors for light vs dark templates.
 */
export function Countdown({
  endsAt,
  tone = 'dark',
}: {
  endsAt: string;
  tone?: 'dark' | 'light';
}) {
  const target = React.useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [state, setState] = React.useState(() => diff(target));

  React.useEffect(() => {
    const t = setInterval(() => setState(diff(target)), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (state.done) return null;

  const units: Unit[] = [
    { label: 'Days', value: state.days },
    { label: 'Hours', value: state.hours },
    { label: 'Minutes', value: state.minutes },
    { label: 'Seconds', value: state.seconds },
  ];

  const cardCls =
    tone === 'dark'
      ? 'border-white/10 bg-white/[0.04] text-white'
      : 'border-ink/10 bg-white text-ink shadow-sm';
  const labelCls = tone === 'dark' ? 'text-white/50' : 'text-ink-muted';

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {units.map((u) => (
        <div key={u.label} className="flex flex-col items-center">
          <div
            className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border backdrop-blur-sm sm:h-20 sm:w-20 ${cardCls}`}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={u.value}
                initial={{ y: '-100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="font-display text-3xl font-black tabular-nums sm:text-4xl"
              >
                {String(u.value).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
          </div>
          <span
            className={`mt-2 font-mono text-[10px] uppercase tracking-[0.18em] ${labelCls}`}
          >
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}
