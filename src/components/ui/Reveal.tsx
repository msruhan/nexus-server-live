'use client';

import { motion, type Variants } from 'framer-motion';
import * as React from 'react';
import { cn } from '@/lib/cn';

const reveal: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger: Variants = {
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-50px' }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={reveal} className={cn(className)}>
      {children}
    </motion.div>
  );
}

/** Word-by-word reveal for editorial headlines */
export function SplitWords({
  text,
  className,
  italic,
}: {
  text: string;
  className?: string;
  italic?: number[];
}) {
  const words = text.split(' ');
  return (
    <span className={cn('inline-flex flex-wrap', className)}>
      {words.map((w, i) => (
        <span key={i} className="overflow-hidden inline-flex pr-[0.25em] last:pr-0">
          <motion.span
            initial={{ y: '110%', opacity: 0 }}
            whileInView={{ y: '0%', opacity: 1 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{
              duration: 0.8,
              delay: i * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn('inline-block', italic?.includes(i) && 'font-serif italic font-normal')}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
