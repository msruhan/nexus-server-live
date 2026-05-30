'use client';

import { motion } from 'framer-motion';
import {
  ArrowsClockwise,
  ShieldCheck,
  Wallet,
  ChartLineUp,
  Lock,
  ClockCounterClockwise,
} from '@phosphor-icons/react/dist/ssr';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';

export function Bento() {
  return (
    <section className="relative bg-paper-100 border-y border-line">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-32">
        <Reveal className="mb-12 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              § 04 · The principles
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-[56px] lg:leading-[1.02]">
              Six things we won&rsquo;t <span className="font-serif italic font-normal">compromise</span> on.
            </h2>
          </div>
        </Reveal>

        {/* Bento grid — asymmetric */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:grid-rows-[280px_280px]">
          {/* Big card — Auto-refund (3 cols) */}
          <Tile className="lg:col-span-3 lg:row-span-1" feature primary>
            <TileHeader num="01" title="Auto-refund, by default" />
            <p className="mt-4 max-w-md font-serif text-lg italic leading-relaxed text-paper/85 lg:text-xl">
              When the upstream returns REJECTED, the desk credits your wallet within seconds.
              No tickets. No chasing. The ledger writes the entry before you finish reading the
              rejection note.
            </p>
            <BigIcon icon={<ShieldCheck weight="duotone" />} />
          </Tile>

          {/* Small card — Polling (2 cols) */}
          <Tile className="lg:col-span-2">
            <TileHeader num="02" title="60-second cadence" small />
            <p className="mt-3 text-[14px] leading-relaxed text-ink/70">
              A worker visits the upstream every minute, in batches of ten, with a one-second
              throttle between requests.
            </p>
            <div className="mt-4 flex items-end gap-1">
              {[2, 5, 3, 6, 4, 7, 5, 8].map((h, i) => (
                <motion.span
                  key={i}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.5 }}
                  className="block w-2 origin-bottom bg-primary-500"
                  style={{ height: `${h * 6}px` }}
                />
              ))}
            </div>
          </Tile>

          {/* Medium card — Wallet (1 col) */}
          <Tile className="lg:col-span-1">
            <TileHeader num="03" title="Wallet ledger" small />
            <Wallet weight="duotone" size={28} className="mt-4 text-ink-muted" />
            <p className="mt-3 text-[12px] leading-relaxed text-ink/65">
              Every TOPUP, PAYMENT, REFUND saved immutably with timestamp.
            </p>
          </Tile>

          {/* Card — Sync (2 cols) */}
          <Tile className="lg:col-span-2">
            <TileHeader num="04" title="Auto-sync upstream" small />
            <div className="mt-4 flex items-center gap-3 font-mono text-xs">
              <ArrowsClockwise weight="bold" size={14} className="text-primary-600" />
              <span className="text-ink-muted">getservices · 03:00 daily</span>
            </div>
            <div className="mt-1 flex items-center gap-3 font-mono text-xs">
              <ArrowsClockwise weight="bold" size={14} className="text-primary-600" />
              <span className="text-ink-muted">accountinfo · every 15 min</span>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-ink/70">
              When the supplier drops a service, our catalog drops it. When their balance dips,
              we alert.
            </p>
          </Tile>

          {/* Card — Security (2 cols) */}
          <Tile className="lg:col-span-2 bg-ink text-paper">
            <TileHeader num="05" title="Tight by design" small dark />
            <Lock weight="duotone" size={28} className="mt-4 text-paper/80" />
            <ul className="mt-3 space-y-1.5 font-mono text-[11px] text-paper/70">
              <li>· bcrypt · rounds 12+</li>
              <li>· API keys encrypted at rest</li>
              <li>· RBAC enforced (middleware + handler)</li>
              <li>· activity log on every sensitive action</li>
            </ul>
          </Tile>

          {/* Card — Stale check (2 cols) */}
          <Tile className="lg:col-span-2">
            <TileHeader num="06" title="Stale order watcher" small />
            <ClockCounterClockwise
              weight="duotone"
              size={28}
              className="mt-4 text-ink-muted"
            />
            <p className="mt-3 text-[14px] leading-relaxed text-ink/70">
              Anything stuck longer than <span className="font-mono font-bold text-ink">72h</span> gets
              flagged for human review. No order disappears in silence.
            </p>
          </Tile>

          {/* Card — Analytics (2 cols) */}
          <Tile className="lg:col-span-2">
            <TileHeader num="07" title="Admin dashboard" small />
            <ChartLineUp weight="duotone" size={28} className="mt-4 text-ink-muted" />
            <p className="mt-3 text-[14px] leading-relaxed text-ink/70">
              Success rate, average delivery, supplier balance, pending count — at a glance, in
              one panel.
            </p>
          </Tile>
        </div>
      </div>
    </section>
  );
}

function Tile({
  children,
  className,
  primary,
  feature,
}: {
  children: React.ReactNode;
  className?: string;
  primary?: boolean;
  feature?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-paper-50 p-6 transition-all hover:shadow-card-hover lg:p-8',
        primary && 'bg-primary-500 text-paper border-primary-600',
        feature && 'min-h-[280px]',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

function TileHeader({
  num,
  title,
  small,
  dark,
}: {
  num: string;
  title: string;
  small?: boolean;
  dark?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <h3
        className={cn(
          'font-display font-extrabold tracking-tight',
          small ? 'text-base' : 'text-2xl lg:text-3xl',
        )}
      >
        {title}
      </h3>
      <span
        className={cn(
          'font-mono text-[10px] uppercase tracking-[0.18em]',
          dark ? 'text-paper/50' : 'text-ink-soft',
        )}
      >
        {num}
      </span>
    </div>
  );
}

function BigIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="absolute -bottom-6 -right-6 text-paper/15">
      <div className="text-[160px] leading-none">{icon}</div>
    </div>
  );
}
