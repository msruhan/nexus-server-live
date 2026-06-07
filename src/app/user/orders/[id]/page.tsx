import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatUSD, formatDate } from '@/lib/format';
import { OrderStatus } from '@/lib/constants';
import { StatusPill } from '@/components/ui/StatusPill';
import { CopyButton } from '@/components/dashboard/CopyButton';
import {
  buildImeiOrderSubmittedFields,
  formatSupplierResponseDisplay,
} from '@/lib/imei-order-input';
import { labelForFieldKey, parseServerFieldDefs } from '@/lib/server-fields';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { id } = await params;
  const { type } = await searchParams;
  const isImei = type !== 'server';

  const order = isImei
    ? await prisma.imeiOrder.findFirst({
        where: { id, userId },
        include: { service: { include: { group: true } } },
      })
    : await prisma.serverOrder.findFirst({
        where: { id, userId },
        include: { service: true },
      });

  if (!order) notFound();

  const filledFields = isImei
    ? (() => {
        const imeiOrder = order as {
          imei: string;
          network?: string | null;
          model?: string | null;
          provider?: string | null;
          pin?: string | null;
          kbh?: string | null;
          mep?: string | null;
          prd?: string | null;
          serialNumber?: string | null;
          ecid?: string | null;
          service: {
            requiresImei: boolean;
            requiresSn: boolean;
            requiresEcid: boolean;
            requiresNetwork: boolean;
            requiresModel: boolean;
            requiresProvider: boolean;
            requiresPin: boolean;
            requiresKbh: boolean;
            requiresMep: boolean;
            requiresPrd: boolean;
          };
        };
        return buildImeiOrderSubmittedFields(imeiOrder, imeiOrder.service);
      })()
    : (() => {
        const serverOrder = order as {
          requiredFields?: string | null;
          service: { requiredFields?: string | null };
        };
        try {
          const parsed = serverOrder.requiredFields
            ? (JSON.parse(serverOrder.requiredFields) as Record<string, string>)
            : {};
          const fieldDefs = parseServerFieldDefs(serverOrder.service.requiredFields);
          if (fieldDefs.length > 0) {
            return fieldDefs
              .map((def) => {
                const value = (parsed[def.key] ?? '').trim();
                return value ? { label: def.label, value } : null;
              })
              .filter((row): row is { label: string; value: string } => row !== null);
          }
          return Object.entries(parsed)
            .filter(([, v]) => typeof v === 'string' && v.trim())
            .map(([key, value]) => ({
              label: labelForFieldKey(key),
              value: value.trim(),
            }));
        } catch {
          return [];
        }
      })();

  const supplierResponse =
    order.status === OrderStatus.REJECTED
      ? formatSupplierResponseDisplay(order.comments, order.code)
      : null;

  return (
    <div className="max-w-4xl">
      <Link
        href="/user/orders"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
      >
        ← Orders
      </Link>

      <div className="mt-4 border-b border-line pb-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {isImei ? 'A · IMEI docket' : 'B · Server docket'}
        </span>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">
          {order.service.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusPill status={order.status} />
          <span className="font-mono text-xs text-ink-muted">{order.orderCode}</span>
          <span className="font-mono text-xs text-ink-soft">·</span>
          <span className="font-mono text-xs text-ink-muted">{formatUSD(order.price)}</span>
        </div>
      </div>

      {order.status === OrderStatus.SUCCESS && order.code && (
        <section className="mt-8 rounded-2xl border-2 border-dashed border-emerald-200/80 bg-emerald-50/50 p-6 lg:p-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-800/85">
            Result code · delivered
          </span>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="flex-1 break-all rounded-md border border-emerald-100/90 bg-white/60 px-4 py-3 font-mono text-lg font-bold tracking-wider text-emerald-900">
              {order.code}
            </code>
            <CopyButton text={order.code} />
          </div>
          {order.comments && (
            <p className="mt-4 whitespace-pre-line font-serif italic text-emerald-900/70">
              {order.comments}
            </p>
          )}
        </section>
      )}

      {order.status === OrderStatus.REJECTED && (
        <div className="mt-8 space-y-4">
          <section className="rounded-xl border border-amber-200/70 bg-amber-50/50 px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-800/90">
              Refunded
            </span>
            <p className="mt-1 text-xs text-ink-muted">
              Wallet credited {formatUSD(order.price)}
            </p>
          </section>

          {supplierResponse?.primary && (
            <section className="rounded-2xl border-2 border-dashed border-rose-200/75 bg-rose-50/45 p-6 lg:p-8">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-800/80">
                Supplier response
              </span>
              <p className="mt-4 whitespace-pre-line break-words font-sans text-base font-medium leading-relaxed text-rose-950/90 md:text-lg">
                {supplierResponse.primary}
              </p>
              {supplierResponse.secondary && (
                <code className="mt-4 block break-all rounded-md border border-rose-100/90 bg-white/55 px-4 py-3 font-mono text-sm text-rose-900/75">
                  {supplierResponse.secondary}
                </code>
              )}
            </section>
          )}
        </div>
      )}

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 border-b border-ink/15 pb-2 font-display text-base font-extrabold tracking-tight text-ink">
            Submitted fields
          </h2>
          <dl className="divide-y divide-line">
            {filledFields.map((f) => (
              <div key={f.label} className="grid grid-cols-3 gap-4 py-3">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  {f.label}
                </dt>
                <dd className="col-span-2 break-all font-mono text-sm text-ink">{f.value}</dd>
              </div>
            ))}
            {(order as { note?: string | null }).note && (
              <div className="grid grid-cols-3 gap-4 py-3">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  Note
                </dt>
                <dd className="col-span-2 font-serif italic text-ink-muted">
                  {(order as { note?: string | null }).note}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          <h2 className="mb-4 border-b border-ink/15 pb-2 font-display text-base font-extrabold tracking-tight text-ink">
            Status timeline
          </h2>
          <ul className="space-y-3">
            <TimelineItem when={order.createdAt} label="Created" done />
            <TimelineItem when={order.processedAt} label="Submitted to server" done={!!order.processedAt} />
            <TimelineItem when={order.processedAt} label="In process" done={!!order.processedAt} />
            <TimelineItem
              when={order.completedAt}
              label={
                order.status === OrderStatus.REJECTED
                  ? 'Rejected'
                  : order.status === OrderStatus.CANCELLED
                    ? 'Cancelled'
                    : 'Completed'
              }
              done={!!order.completedAt}
            />
          </ul>

          {order.referenceId && (
            <div className="mt-6 rounded-md border border-line bg-paper-100 px-3 py-2 font-mono text-[11px] text-ink-muted">
              Server ref · {order.referenceId}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TimelineItem({
  when,
  label,
  done,
}: {
  when: Date | null | undefined;
  label: string;
  done: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          done ? 'bg-ink text-paper' : 'border border-line bg-paper'
        }`}
      >
        {done ? (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5l3 3 5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="block h-1.5 w-1.5 rounded-full bg-ink-soft" />
        )}
      </span>
      <span className={`flex-1 text-sm ${done ? 'font-medium text-ink' : 'text-ink-muted'}`}>{label}</span>
      <span className="font-mono text-[10px] text-ink-soft">{when ? formatDate(when) : '—'}</span>
    </li>
  );
}
