import Link from 'next/link';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProviderCards } from './ProviderCards';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  const providers = await prisma.imeiApi.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { services: true, serverServices: true } } },
  });

  const cards = providers.map((p) => ({
    id: p.id,
    title: p.title,
    host: p.host,
    status: p.status,
    updatedAt: p.updatedAt.toISOString(),
    servicesCount: p._count.services,
    serverServicesCount: p._count.serverServices,
  }));

  return (
    <div>
      <PageHeader
        section="§ Admin · Providers"
        title={
          <>
            Upstream <span className="font-serif italic font-normal">connections</span>.
          </>
        }
        subtitle="DhruFusion provider configurations · host, credentials, balance, sync schedule."
        actions={
          <Link
            href="/admin/providers/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-primary-600"
          >
            <Plus weight="bold" size={12} /> Add provider
          </Link>
        }
      />

      {providers.length === 0 ? (
        <EmptyState
          title="No providers yet"
          description="Add your first DhruFusion connection to start syncing services."
        />
      ) : (
        <ProviderCards providers={cards} />
      )}
    </div>
  );
}
