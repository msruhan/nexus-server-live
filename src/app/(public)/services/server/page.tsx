import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ServiceStatus } from '@/lib/constants';
import { PublicServicesTable } from '@/app/(public)/services/components/PublicServicesTable';

export const dynamic = 'force-dynamic';

export default async function ServerServicesPage() {
  const services = await prisma.serverService.findMany({
    where: { status: ServiceStatus.ACTIVE },
    orderBy: { price: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      deliveryTime: true,
      price: true,
      box: { select: { id: true, title: true } },
    },
  });

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-24">
      <div className="border-b border-line pb-12">
        <Link
          href="/services"
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
        >
          ← Back to catalog
        </Link>
        <span className="mt-6 block font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          B · Server register
        </span>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink lg:text-6xl">
          Server <span className="font-serif italic font-normal">services</span>.
        </h1>
        <p className="mt-5 max-w-2xl font-serif text-lg italic leading-relaxed text-ink-muted">
          Server and remote services — FRP bypass, Mi Account removal, software repair,
          firmware flashing, dan EFS/IMEI repair.
        </p>
      </div>

      <PublicServicesTable
        rows={services.map((s) => ({
          id: s.id,
          type: 'server' as const,
          title: s.title,
          description: s.description,
          deliveryTime: s.deliveryTime,
          price: Number(s.price),
          groupId: s.box.id,
          groupTitle: s.box.title,
        }))}
      />
    </section>
  );
}
