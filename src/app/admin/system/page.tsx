import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCurrentVersion, revalidateIfStale } from '@/lib/license/client';
import { SystemPanel } from './SystemPanel';

export const dynamic = 'force-dynamic';

export default async function AdminSystemPage() {
  // Always re-check with the License Server when opening this page so a
  // vendor-side revoke/expiry is reflected immediately (maxAge 0 = force).
  await revalidateIfStale(0);

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      licenseStatus: true,
      licenseKey: true,
      licenseDomain: true,
      licensePlan: true,
      licenseExpiresAt: true,
      licenseLastValidated: true,
      licenseReason: true,
      licenseRenewalCheckoutUrl: true,
      licenseRenewalDeskUrl: true,
      lastUpdateVersion: true,
      lastUpdateAt: true,
    },
  });

  const recentUpdates = await prisma.updateLog.findMany({
    orderBy: { appliedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      fromVersion: true,
      toVersion: true,
      status: true,
      error: true,
      appliedAt: true,
      durationSeconds: true,
    },
  });

  return (
    <div className="max-w-4xl">
      <PageHeader
        section="§ Admin · system"
        title={
          <>
            System &amp; <span className="font-serif italic font-normal">update</span>.
          </>
        }
        subtitle="Manage your license, check for updates, and keep your installation up to date."
      />
      <SystemPanel
        initial={{
          currentVersion: getCurrentVersion(),
          license: {
            status: (settings?.licenseStatus as 'active' | 'inactive' | 'not_activated') ?? 'not_activated',
            key: settings?.licenseKey ? '••••••' + settings.licenseKey.slice(-8) : null,
            domain: settings?.licenseDomain ?? null,
            plan: settings?.licensePlan ?? null,
            expiresAt: settings?.licenseExpiresAt?.toISOString() ?? null,
            lastValidatedAt: settings?.licenseLastValidated?.toISOString() ?? null,
            reason: settings?.licenseReason ?? null,
            renewalCheckoutUrl: settings?.licenseRenewalCheckoutUrl ?? null,
            renewalDeskUrl: settings?.licenseRenewalDeskUrl ?? null,
          },
          lastUpdate: {
            version: settings?.lastUpdateVersion ?? null,
            at: settings?.lastUpdateAt?.toISOString() ?? null,
          },
          updateHistory: recentUpdates.map((u) => ({
            ...u,
            appliedAt: u.appliedAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}
