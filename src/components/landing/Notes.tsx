'use client';

import * as React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { motion } from 'framer-motion';
import { ArrowUpRight, Plus } from '@phosphor-icons/react/dist/ssr';
import { Reveal } from '@/components/ui/Reveal';
import { RichText } from './RichText';

type FaqItem = { id: string; question: string; answer: string };

const FALLBACK: FaqItem[] = [
  {
    id: '1',
    question: 'Do I need my own DhruFusion API key?',
    answer:
      'No. The bureau holds the upstream connection. You register, fund your wallet, and submit dockets.',
  },
  {
    id: '2',
    question: 'How long does an order usually take?',
    answer:
      'Network unlocks resolve in 2 minutes to 48 hours. iCloud removals take 3–7 days.',
  },
  {
    id: '3',
    question: 'What happens if my order is rejected?',
    answer:
      'The poller picks up the REJECTED status from DhruFusion and the system writes a REFUND ledger entry to your wallet within seconds.',
  },
];

export function Notes({ items, heading }: { items?: FaqItem[]; heading?: string }) {
  const list = items && items.length > 0 ? items : FALLBACK;
  const displayHeading = heading ?? 'Things people {italic:always} ask.';

  return (
    <section id="notes" className="relative bg-paper-100 border-y border-line">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              § Notes from the desk
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-[56px] lg:leading-[1.02]">
              <RichText text={displayHeading} />
            </h2>

            <p className="mt-6 font-serif text-lg italic leading-relaxed text-ink/70">
              Common questions, answered plainly. If yours isn&rsquo;t here, support replies in
              under five minutes during working hours.
            </p>

            <a
              href="#"
              className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink"
            >
              <span className="border-b border-ink pb-0.5 transition-colors group-hover:border-primary-500 group-hover:text-primary-700">
                Open the support desk
              </span>
              <ArrowUpRight
                weight="bold"
                size={14}
                className="transition-transform group-hover:rotate-45"
              />
            </a>
          </Reveal>

          <div className="lg:col-span-8">
            <div className="hidden border-b border-ink/15 pb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted sm:flex sm:justify-between">
              <span>Q.</span>
              <span>{list.length} entries</span>
            </div>

            <Accordion.Root type="single" collapsible defaultValue="item-0">
              {list.map((n, idx) => (
                <NoteItem key={n.id} value={`item-${idx}`} num={idx + 1} q={n.question} a={n.answer} />
              ))}
            </Accordion.Root>
          </div>
        </div>
      </div>
    </section>
  );
}

function NoteItem({
  value,
  num,
  q,
  a,
}: {
  value: string;
  num: number;
  q: string;
  a: string;
}) {
  return (
    <Accordion.Item
      value={value}
      className="group border-b border-line transition-colors hover:bg-paper/40 data-[state=open]:bg-paper/60"
    >
      <Accordion.Header>
        <Accordion.Trigger className="flex w-full items-start justify-between gap-6 py-6 text-left transition-colors group-data-[state=open]:pb-3">
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-[11px] tabular-nums tracking-[0.18em] text-ink-soft">
              {String(num).padStart(2, '0')}
            </span>
            <h3 className="font-display text-lg font-extrabold leading-snug tracking-tight text-ink sm:text-xl lg:text-2xl">
              {q}
            </h3>
          </div>
          <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-ink transition-all duration-300 group-data-[state=open]:rotate-45 group-data-[state=open]:border-primary-500 group-data-[state=open]:bg-primary-500 group-data-[state=open]:text-paper">
            <Plus weight="bold" size={14} />
          </span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="ml-10 max-w-3xl pb-7 pr-12"
        >
          <p className="font-serif text-lg italic leading-relaxed text-ink/80 lg:text-xl lg:leading-[1.55]">
            {a}
          </p>
        </motion.div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
