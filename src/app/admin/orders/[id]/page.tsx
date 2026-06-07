import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@/lib/constants';
import { formatUSD, formatDate } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';
import { OrderActions } from './OrderActions';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type } = await searchParams;
  const isImei = type !== 'server';

  const order = isImei
    ? await prisma.imeiOrder.findUnique({
        where: { id },
        include: { service: { include: { group: true } }, user: true },
      })
    : await prisma.serverOrder.findUnique({
        where: { id },
        include: { service: true, user: true },
      });
  if (!order) notFound();

  const cancellable =
    order.status === OrderStatus.PENDING ||
    order.status === OrderStatus.IN_PROCESS;

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/orders"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
      >
        ← Orders
      </Link>

      <div className="mt-4 border-b border-line pb-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {isImei ? 'A · IMEI docket' : 'B · Server docket'} · admin view
        </span>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">
          {order.service.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusPill status={order.status} />
          <span className="font-mono text-xs text-ink-muted">{order.orderCode}</span>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Section title="User">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Name" value={order.user.name} />
              <Field label="Email" value={order.user.email} mono />
            </div>
          </Section>

          <Section title="Submission">
            <dl className="divide-y divide-line">
              {(isImei
                ? imeiFields(order, order.service as unknown as Record<string, unknown>)
                : serverFields(order))
                .filter((f) => f.value)
                .map((f) => (
                  <div key={f.label} className="grid grid-cols-3 gap-4 py-2.5">
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {f.label}
                    </dt>
                    <dd className="col-span-2 break-all font-mono text-sm">{f.value}</dd>
                  </div>
                ))}
            </dl>
          </Section>

          {(order.code || order.comments) && (
            <Section title="Upstream result">
              {order.code && (
                <code className="block break-all rounded-md border border-line bg-paper-100 px-4 py-3 font-mono text-base font-bold text-ink">
                  {order.code}
                </code>
              )}
              {order.comments && (
                <p className="mt-3 whitespace-pre-line font-serif italic text-ink-muted">
                  {order.comments}
                </p>
              )}
            </Section>
          )}
        </div>

        <aside className="space-y-6">
          <Section title="Pricing">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Price" value={formatUSD(order.price)} mono />
              <Field label="Method" value="wallet" />
            </div>
          </Section>

          <Section title="Timestamps">
            <ul className="space-y-2 text-xs">
              <Stamp label="Created" date={order.createdAt} />
              <Stamp label="In process" date={order.processedAt} />
              <Stamp label="Completed" date={order.completedAt} />
            </ul>
          </Section>

          <Section title="Actions">
            <OrderActions orderId={order.id} type={isImei ? 'imei' : 'server'} cancellable={cancellable} />
          </Section>
        </aside>
      </div>
    </div>
  );
}

function imeiFields(o: Record<string, unknown>, service: Record<string, unknown>) {
  const requiresImei = Boolean(service.requiresImei);
  const requiresSn = Boolean(service.requiresSn);
  const requiresEcid = Boolean(service.requiresEcid);
  return [
    ...(requiresImei ? [{ label: 'IMEI', value: o.imei as string }] : []),
    ...(requiresSn && !requiresImei ? [{ label: 'Serial Number', value: (o.serialNumber as string) ?? (o.imei as string) }] : []),
    ...(requiresEcid && !requiresImei && !requiresSn ? [{ label: 'ECID', value: (o.ecid as string) ?? (o.imei as string) }] : []),
    ...(requiresSn && requiresImei ? [{ label: 'Serial Number', value: (o.serialNumber as string) ?? null }] : []),
    ...(requiresEcid && (requiresImei || requiresSn) ? [{ label: 'ECID', value: (o.ecid as string) ?? null }] : []),
    { label: 'Network', value: (o.network as string) ?? null },
    { label: 'Model', value: (o.model as string) ?? null },
    { label: 'Provider', value: (o.provider as string) ?? null },
    { label: 'Email', value: (o.email as string) ?? null },
    { label: 'Note', value: (o.note as string) ?? null },
    { label: 'Upstream ID', value: (o.referenceId as string) ?? null },
  ];
}

function serverFields(o: Record<string, unknown>) {
  return [
    { label: 'Email', value: (o.email as string) ?? null },
    { label: 'Notes', value: (o.notes as string) ?? null },
    { label: 'Fields', value: (o.requiredFields as string) ?? null },
    { label: 'Upstream ID', value: (o.referenceId as string) ?? null },
  ];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-paper-50 p-5">
      <h3 className="border-b border-line pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
      <div className={`mt-0.5 ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value}</div>
    </div>
  );
}

function Stamp({ label, date }: { label: string; date: Date | null | undefined }) {
  return (
    <li className="flex items-center justify-between border-b border-line pb-1 last:border-0">
      <span className="font-mono uppercase text-ink-muted">{label}</span>
      <span className="font-mono text-ink">{date ? formatDate(date) : '—'}</span>
    </li>
  );
}
