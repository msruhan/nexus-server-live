import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatUSD } from '@/lib/format';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { ImeiOrderForm } from './ImeiOrderForm';

export const dynamic = 'force-dynamic';

export default async function NewImeiOrderPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { serviceId } = await params;

  const [service, wallet] = await Promise.all([
    prisma.imeiService.findUnique({
      where: { id: serviceId },
      include: { group: true },
    }),
    prisma.wallet.findUnique({ where: { userId } }),
  ]);
  if (!service) notFound();

  const balance = wallet?.balance ?? new Prisma.Decimal(0);
  const sufficient = !balance.lessThan(service.price);

  return (
    <div className="max-w-3xl">
      <Link
        href="/user/services/imei"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
      >
        ← IMEI register
      </Link>
      <span className="mt-4 block font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
        New IMEI docket · A.{service.toolId}
      </span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">
        {service.title}
      </h1>
      {service.description && (
        <div
          className="prose prose-ink mt-2 max-w-2xl"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(service.description) }}
        />
      )}

      {/* Service summary card */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <SummaryCard label="Price" value={formatUSD(service.price)} accent="ink" />
        <SummaryCard label="Delivery" value={service.deliveryTime ?? '—'} />
        <SummaryCard label="Group" value={service.group.title} />
      </div>

      {/* Wallet status */}
      <div
        className={`mt-6 rounded-xl border p-4 ${
          sufficient
            ? 'border-line bg-paper-50'
            : 'border-amber-300 bg-amber-50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Wallet balance
            </span>
            <div className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink">
              {formatUSD(balance)}
            </div>
          </div>
          {!sufficient && (
            <Link
              href="/user/wallet"
              className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-primary-600"
            >
              Top up wallet
            </Link>
          )}
        </div>
        {!sufficient && (
          <p className="mt-2 font-serif text-sm italic text-amber-800">
            Insufficient balance by {formatUSD(service.price.sub(balance))} for this order.
          </p>
        )}
      </div>

      {sufficient && (
        <div className="mt-8">
          <ImeiOrderForm
            serviceId={service.id}
            requires={{
              imei: service.requiresImei,
              network: service.requiresNetwork,
              model: service.requiresModel,
              provider: service.requiresProvider,
              pin: service.requiresPin,
              kbh: service.requiresKbh,
              mep: service.requiresMep,
              prd: service.requiresPrd,
              sn: service.requiresSn,
              email: false,
              note: false,
            }}
          />
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'ink';
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent === 'ink' ? 'border-ink bg-ink text-paper' : 'border-line bg-paper-50'
      }`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
          accent === 'ink' ? 'text-paper/70' : 'text-ink-muted'
        }`}
      >
        {label}
      </div>
      <div className="mt-1 font-display text-base font-extrabold tracking-tight">{value}</div>
    </div>
  );
}
