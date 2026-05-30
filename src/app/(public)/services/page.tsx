import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/db';
import { formatUSD, minAmount } from '@/lib/format';
import { ServiceStatus } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function ServicesIndexPage() {
  const [imeiCount, serverCount, groups] = await Promise.all([
    prisma.imeiService.count({ where: { status: ServiceStatus.ACTIVE } }),
    prisma.serverService.count({ where: { status: ServiceStatus.ACTIVE } }),
    prisma.imeiServiceGroup.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        services: {
          where: { status: ServiceStatus.ACTIVE },
          select: { id: true, price: true },
        },
      },
    }),
  ]);

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-24">
      <div className="border-b border-line pb-12">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          § Catalog
        </span>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[64px] lg:leading-[1.04]">
          The bureau&rsquo;s <span className="font-serif italic font-normal">complete</span>{' '}
          register.
        </h1>
        <p className="mt-5 max-w-2xl font-serif text-lg italic leading-relaxed text-ink-muted">
          Two registers, {imeiCount + serverCount} active entries between them. Browse, pick, fund
          your wallet, submit. The desk handles the rest.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {/* IMEI register */}
        <RegisterCard
          tag="A · IMEI register"
          title="IMEI-based services"
          desc="Network unlock, iCloud removal, IMEI check, carrier unlock, premium services."
          count={imeiCount}
          href="/services/imei"
          accent="ink"
        />
        <RegisterCard
          tag="B · Server register"
          title="Server-based services"
          desc="FRP bypass, Mi Account removal, software repair, firmware flashing, EFS repair."
          count={serverCount}
          href="/services/server"
          accent="primary"
        />
      </div>

      {/* Groups preview */}
      <h2 className="mt-20 font-display text-2xl font-extrabold tracking-tight text-ink">
        Groups in the IMEI register
      </h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g, i) => (
          <Link
            key={g.id}
            href={`/services/imei/${g.id}`}
            className="group rounded-xl border border-line bg-paper-50 p-5 transition-all hover:border-ink hover:shadow-card-hover"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              0{i + 1}
            </div>
            <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-ink">
              {g.title}
            </h3>
            <p className="mt-1 font-serif text-sm italic text-ink-muted">
              {g.services.length} entries · from{' '}
              {g.services.length > 0
                ? formatUSD(minAmount(g.services.map((s) => s.price)))
                : '—'}
            </p>
            <ArrowUpRight
              weight="bold"
              size={14}
              className="mt-4 text-ink-soft transition-all group-hover:rotate-45 group-hover:text-ink"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

function RegisterCard({
  tag,
  title,
  desc,
  count,
  href,
  accent,
}: {
  tag: string;
  title: string;
  desc: string;
  count: number;
  href: string;
  accent: 'ink' | 'primary';
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-8 transition-all hover:shadow-card-hover ${
        accent === 'ink'
          ? 'border-line bg-paper-50 hover:border-ink'
          : 'border-primary-600 bg-primary-500 text-paper hover:bg-primary-600'
      }`}
    >
      <div>
        <span
          className={`font-mono text-[11px] uppercase tracking-[0.2em] ${
            accent === 'ink' ? 'text-ink-muted' : 'text-paper/70'
          }`}
        >
          {tag}
        </span>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight">{title}</h2>
        <p
          className={`mt-3 max-w-md font-serif italic ${
            accent === 'ink' ? 'text-ink-muted' : 'text-paper/80'
          }`}
        >
          {desc}
        </p>
      </div>
      <div className="mt-12 flex items-end justify-between">
        <div>
          <div
            className={`font-mono text-[10px] uppercase tracking-wider ${
              accent === 'ink' ? 'text-ink-muted' : 'text-paper/70'
            }`}
          >
            Active entries
          </div>
          <div className="font-display text-5xl font-black tracking-tight">{count}</div>
        </div>
        <ArrowUpRight
          weight="bold"
          size={32}
          className="transition-transform duration-500 group-hover:rotate-45"
        />
      </div>
    </Link>
  );
}
