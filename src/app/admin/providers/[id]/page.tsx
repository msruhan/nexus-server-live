import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';
import { ProviderForm } from './ProviderForm';
import { ProviderActions } from './ProviderActions';

export const dynamic = 'force-dynamic';

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = await prisma.imeiApi.findUnique({
    where: { id },
    include: { _count: { select: { services: true, serverServices: true } } },
  });
  if (!provider) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/providers" className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink">
        ← Providers
      </Link>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">
          {provider.title}
        </h1>
        <StatusPill status={provider.status} />
      </div>
      <p className="mt-2 font-mono text-xs text-ink-muted">{provider.host}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card label="Username" value={provider.username} />
        <Card label="Linked services" value={String(provider._count.services + provider._count.serverServices)} />
      </div>

      <div className="mt-10">
        <h2 className="border-b border-ink/15 pb-3 font-display text-lg font-extrabold tracking-tight text-ink">
          Actions
        </h2>
        <div className="mt-4">
          <ProviderActions providerId={provider.id} />
        </div>
      </div>

      <div className="mt-12">
        <h2 className="border-b border-ink/15 pb-3 font-display text-lg font-extrabold tracking-tight text-ink">
          Configuration
        </h2>
        <div className="mt-4">
          <ProviderForm
            initial={{
              id: provider.id,
              title: provider.title,
              host: provider.host,
              username: provider.username,
              apiKey: '',
              status: provider.status,
              notes: provider.notes ?? '',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper-50 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">{label}</div>
      <div className="mt-1 font-display text-base font-extrabold tracking-tight text-ink">{value}</div>
    </div>
  );
}
