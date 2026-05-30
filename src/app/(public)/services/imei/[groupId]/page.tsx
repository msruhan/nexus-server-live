import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/db';
import { ServiceStatus } from '@/lib/constants';
import { formatUSD } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ImeiGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const group = await prisma.imeiServiceGroup.findUnique({
    where: { id: groupId },
    include: {
      services: {
        where: { status: ServiceStatus.ACTIVE },
        orderBy: { price: 'asc' },
      },
    },
  });

  if (!group) notFound();

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-24">
      <Link
        href="/services/imei"
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
      >
        ← IMEI register
      </Link>
      <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-ink lg:text-6xl">
        {group.title}
      </h1>
      {group.description && (
        <p className="mt-4 max-w-2xl font-serif text-lg italic text-ink-muted">
          {group.description}
        </p>
      )}

      <div className="mt-12 divide-y divide-line border-y border-line">
        {group.services.map((s) => (
          <Link
            key={s.id}
            href={`/user/orders/new/imei/${s.id}`}
            className="group flex flex-wrap items-center gap-4 py-6 transition-colors hover:bg-paper-100 lg:flex-nowrap"
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft lg:w-20">
              A.{s.toolId}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">
                {s.title}
              </h3>
              {s.description && (
                <p className="mt-1 font-serif italic text-ink-muted">{s.description}</p>
              )}
            </div>
            <div className="font-mono text-sm text-ink-muted lg:w-32">{s.deliveryTime}</div>
            <div className="font-display text-xl font-black tracking-tight text-ink lg:w-44 lg:text-right">
              {formatUSD(s.price)}
            </div>
            <ArrowUpRight
              weight="bold"
              size={16}
              className="text-ink-soft transition-all group-hover:rotate-45 group-hover:text-ink"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
