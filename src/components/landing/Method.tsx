'use client';

import { motion } from 'framer-motion';
import { Reveal } from '@/components/ui/Reveal';

const steps = [
  {
    no: '01',
    label: 'Open account',
    body: 'Email + password. Wallet is provisioned the moment you confirm. No gatekeeping, no sales call.',
    log: 'POST /api/auth/register → 201 created · wallet#created · ledger initialized',
    duration: '< 30s',
  },
  {
    no: '02',
    label: 'Top up wallet',
    body: 'Submit a top-up request. Admin approves. Balance lands in your ledger as an immutable TOPUP entry.',
    log: 'wallet.topup approved · LedgerType=TOPUP · amount=$50.00 · balance=$50.00',
    duration: '~ 2 min',
  },
  {
    no: '03',
    label: 'Pick a service',
    body: 'Browse the catalog. Each line is annotated with required fields, delivery window, final price.',
    log: 'GET /api/services/catalog?status=ACTIVE → 47 entries · cached 60s · grouped by category',
    duration: 'browse',
  },
  {
    no: '04',
    label: 'Submit the docket',
    body: 'Fill device details + the fields the service asks for. Wallet is debited atomically. Order is created PENDING.',
    log: 'POST /api/imei/orders → 201 · status=PENDING · wallet debited · idempotency lock 5m',
    duration: 'instant',
  },
  {
    no: '05',
    label: 'Hand off to upstream',
    body: 'We POST placeorder to DhruFusion. Their reference ID is stored as referenceId.',
    log: 'POST {host}/api/index.php action=placeorder → 200 · ID=987654 · status→SUBMITTED',
    duration: 'auto',
  },
  {
    no: '06',
    label: 'Polling cadence',
    body: 'Background worker visits the upstream every 60 seconds for SUBMITTED + IN_PROCESS orders.',
    log: 'cron · poll-imei-orders · batch=10 · throttle=1s · 4 changed · 6 unchanged',
    duration: '60s loop',
  },
  {
    no: '07',
    label: 'Resolution',
    body: 'SUCCESS → result code lands on your dashboard. REJECTED → wallet auto-credited as REFUND.',
    log: 'order.status_changed → SUCCESS · code set · notify(user) · activity logged',
    duration: 'on completion',
  },
];

export function Method() {
  return (
    <section id="method" className="relative">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-32">
        <Reveal className="mb-16 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              § 02 · Method
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-[56px] lg:leading-[1.02]">
              How a job <span className="font-serif italic font-normal">moves</span> through the desk.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <p className="font-serif text-lg italic leading-relaxed text-ink/70 lg:text-xl">
              Seven steps, observed honestly. Nothing here is theatrical — these are the actual
              transitions a docket passes through, with the actual log lines that get written.
            </p>
          </div>
        </Reveal>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical rule */}
          <div className="pointer-events-none absolute left-[18px] top-0 h-full w-px bg-line lg:left-[68px]" />

          <div className="space-y-10 lg:space-y-12">
            {steps.map((step, idx) => (
              <motion.div
                key={step.no}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="relative grid grid-cols-12 gap-x-6 gap-y-3 lg:gap-x-10"
              >
                {/* Number with node */}
                <div className="col-span-12 flex items-baseline gap-4 lg:col-span-2">
                  <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper font-mono text-xs font-bold tabular-nums text-ink">
                    {step.no}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft lg:hidden">
                    {step.duration}
                  </span>
                </div>

                {/* Title + body */}
                <div className="col-span-12 lg:col-span-5">
                  <h3 className="font-display text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">
                    {step.label}
                  </h3>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink/70">
                    {step.body}
                  </p>
                </div>

                {/* Log block — terminal feel */}
                <div className="col-span-12 lg:col-span-5">
                  <div className="flex items-center justify-between border-b border-dashed border-line py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                    <span>log entry</span>
                    <span>{step.duration}</span>
                  </div>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-ink p-4 font-mono text-[12px] leading-relaxed text-paper/90">
                    <span className="text-amber-400">$ </span>
                    <span className="text-paper/60"># {step.label.toLowerCase()}</span>
                    {'\n'}
                    <span className="text-primary-300">{step.log}</span>
                  </pre>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
