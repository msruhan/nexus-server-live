'use client';

import { useEffect, useRef } from 'react';
import { animate, useInView, useMotionValue } from 'framer-motion';

export function Counter({
  to,
  duration = 1.6,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });
  const mv = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [inView, to, duration, mv]);

  useEffect(() => {
    return mv.on('change', (latest) => {
      if (ref.current) {
        const formatted = decimals > 0
          ? latest.toFixed(decimals)
          : new Intl.NumberFormat('en-US').format(Math.round(latest));
        ref.current.textContent = `${prefix}${formatted}${suffix}`;
      }
    });
  }, [mv, prefix, suffix, decimals]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}0{suffix}
    </span>
  );
}
