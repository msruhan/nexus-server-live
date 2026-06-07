import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { getIpPolicyAdminSnapshot } from '@/lib/global-ip-policy';
import { IpManagementPanel } from './IpManagementPanel';

export const dynamic = 'force-dynamic';

export default async function AdminIpManagementPage() {
  const data = await getIpPolicyAdminSnapshot();

  return (
    <div className="max-w-5xl">
      <PageHeader
        section="§ Admin · Security"
        title={
          <>
            IP <span className="font-serif italic font-normal">management</span>.
          </>
        }
        subtitle="Block abusive visitors site-wide, and whitelist reseller server IPs that may sync via API keys."
      />
      <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
        <IpManagementPanel
          initialBlocked={data.blocked.map(serialize)}
          initialWhitelisted={data.whitelisted.map(serialize)}
          initialEnforced={data.apiIpWhitelistEnforced}
        />
      </Suspense>
    </div>
  );
}

function serialize(e: {
  id: string;
  ip: string;
  label: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: Date;
  userId?: string | null;
  user?: { id: string; email: string; name: string } | null;
}) {
  return {
    id: e.id,
    ip: e.ip,
    label: e.label,
    note: e.note,
    createdBy: e.createdBy,
    createdAt: e.createdAt.toISOString(),
    userId: e.userId ?? null,
    ownerEmail: e.user?.email ?? null,
    ownerName: e.user?.name ?? null,
  };
}
