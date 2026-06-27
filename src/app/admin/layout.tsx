import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileBar } from '@/components/dashboard/MobileBar';
import { LicenseBanner } from '@/components/dashboard/LicenseBanner';
import { AccountThemeShell } from '@/components/appearance/AccountThemeShell';
import { getAdminNavBadges } from '@/lib/admin-nav-badges';
import { getPermissions } from '@/lib/sub-admin';
import { resolveRoutePermission } from '@/lib/admin-route-permissions';
import { getBranding } from '@/lib/branding';
import { revalidateIfStale } from '@/lib/license/client';
import {
  getLicenseEnforcementState,
  isLicenseRuntimeLocked,
} from '@/lib/license-state';
import { guardAgainstBlockedIp } from '@/lib/ip-block-guard';
import { getActiveAnnouncements } from '@/lib/announcements';
import { GlobalAnnouncementBar } from '@/components/announcements/GlobalAnnouncementBar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await guardAgainstBlockedIp();

  const session = await auth();
  if (!session?.user) redirect('/login?next=/admin/dashboard');
  const role = session.user.role as string;
  if (role !== 'ADMIN' && role !== 'SUB_ADMIN') redirect('/user/dashboard');

  // Force-2FA policy. Opt-in via SiteSettings.enforceAdmin2FA. The dedicated
  // /2fa-required page lives outside this layout so admins without 2FA can
  // still see the warning + setup link without recursing into a redirect loop.
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      enforceAdmin2FA: true,
      licenseStatus: true,
      licenseReason: true,
      licenseRenewalCheckoutUrl: true,
      licenseRenewalDeskUrl: true,
    },
  });

  // Lazy, non-blocking license freshness check. If the last successful
  // validation is stale (>15 min), re-check with the License Server in the
  // background so a vendor-side revoke surfaces across the dashboard.
  void revalidateIfStale();

  const pathname = (await headers()).get('x-pathname') ?? '';
  const licenseState = await getLicenseEnforcementState();
  const licenseLockdown = isLicenseRuntimeLocked(licenseState);
  if (licenseLockdown) {
    if (role !== 'ADMIN') {
      redirect('/license-suspended');
    }
    // x-pathname is missing on some RSC flight requests; redirecting with an
    // empty path causes an infinite /admin/system?_rsc=… loop.
    if (pathname && !pathname.startsWith('/admin/system')) {
      redirect('/admin/system');
    }
  }

  if (settings?.enforceAdmin2FA) {
    const fresh = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true },
    });
    if (!fresh?.twoFactorEnabled) {
      redirect('/2fa-required');
    }
  }

  const userInfo = {
    name: session.user.name ?? 'Admin',
    email: session.user.email ?? '',
    role,
  };

  // For SUB_ADMIN, load their permission map to (a) filter the sidebar and
  // (b) enforce per-route access centrally.
  const permissions =
    role === 'SUB_ADMIN' ? await getPermissions(session.user.id) : null;

  // Central per-route permission enforcement for SUB_ADMIN. We read the
  // pathname forwarded by middleware via the x-pathname header.
  if (role === 'SUB_ADMIN') {
    const pathname = (await headers()).get('x-pathname') ?? '';
    if (pathname) {
      const rule = resolveRoutePermission(pathname);
      const permMap = (permissions ?? {}) as Record<string, boolean>;
      let allowed = false;
      if ('allowAll' in rule) allowed = true;
      else if ('perm' in rule) allowed = permMap[rule.perm] === true;
      else allowed = false; // adminOnly route → SUB_ADMIN blocked
      if (!allowed && pathname !== '/admin/no-access') {
        redirect('/admin/no-access');
      }
    }
  }

  const navBadges = await getAdminNavBadges();
  const brand = await getBranding();
  const announcements = await getActiveAnnouncements(true);

  return (
    <AccountThemeShell userId={session.user.id}>
      <Sidebar
        variant="admin"
        user={userInfo}
        navBadges={navBadges}
        permissions={permissions as Record<string, boolean> | null}
        brand={{ siteName: brand.siteName, logoUrl: brand.logoUrl }}
        licenseLockdown={licenseLockdown}
      >
        <GlobalAnnouncementBar items={announcements} />
        <MobileBar user={userInfo} />
        <LicenseBanner
          status={settings?.licenseStatus ?? 'not_activated'}
          reason={settings?.licenseReason ?? null}
          renewalCheckoutUrl={settings?.licenseRenewalCheckoutUrl}
          renewalDeskUrl={settings?.licenseRenewalDeskUrl}
        />
        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
      </Sidebar>
    </AccountThemeShell>
  );
}
