import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatUSD } from '@/lib/format';
import { parseServerFieldDefs } from '@/lib/server-fields';
import { ServerOrderForm } from './ServerOrderForm';

export const dynamic = 'force-dynamic';

export default async function NewServerOrderPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { serviceId } = await params;

  const [service, wallet] = await Promise.all([
    prisma.serverService.findUnique({ where: { id: serviceId } }),
    prisma.wallet.findUnique({ where: { userId } }),
  ]);
  if (!service) notFound();

  const balance = wallet?.balance ?? new Prisma.Decimal(0);
  const sufficient = !balance.lessThan(service.price);
  const fieldDefs = parseServerFieldDefs(service.requiredFields);

  return (
    <div className="max-w-3xl">
      <Link
        href="/user/services/server"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
      >
        ← Server register
      </Link>
      <span className="mt-4 block font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
        New server docket · B.{service.toolId ?? '—'}
      </span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">
        {service.title}
      </h1>
      {service.description && (
        <div
          className="prose prose-ink mt-2 max-w-2xl"
          dangerouslySetInnerHTML={{ __html: service.description }}
        />
      )}

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-ink bg-ink p-4 text-paper">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/70">Price</div>
          <div className="mt-1 font-display text-base font-extrabold">{formatUSD(service.price)}</div>
        </div>
        <div className="rounded-xl border border-line bg-paper-50 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Delivery</div>
          <div className="mt-1 font-display text-base font-extrabold text-ink">{service.deliveryTime ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-line bg-paper-50 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Wallet</div>
          <div className="mt-1 font-display text-base font-extrabold text-ink">{formatUSD(balance)}</div>
        </div>
      </div>

      {!sufficient ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-serif italic text-amber-800">
            Insufficient balance {formatUSD(service.price.sub(balance))}.{' '}
            <Link href="/user/wallet" className="font-bold not-italic text-ink underline">
              Top up wallet
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <ServerOrderForm serviceId={service.id} fieldDefs={fieldDefs} />
        </div>
      )}
    </div>
  );
}
