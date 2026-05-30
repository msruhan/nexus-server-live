import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileBar } from '@/components/dashboard/MobileBar';
import { AccountThemeShell } from '@/components/appearance/AccountThemeShell';
import { getAdminNavBadges } from '@/lib/admin-nav-badges';
import { getPermissions } from '@/lib/sub-admin';
import { resolveRoutePermission } from '@/lib/admin-route-permissions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/admin/dashboard');
  const role = session.user.role as string;
  if (role !== 'ADMIN' && role !== 'SUB_ADMIN') redirect('/user/dashboard');

  // Force-2FA policy. Opt-in via SiteSettings.enforceAdmin2FA. The dedicated
  // /2fa-required page lives outside this layout so admins without 2FA can
  // still see the warning + setup link without recursing into a redirect loop.
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { enforceAdmin2FA: true },
  });

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

  return (
    <AccountThemeShell userId={session.user.id}>
      <Sidebar
        variant="admin"
        user={userInfo}
        navBadges={navBadges}
        permissions={permissions as Record<string, boolean> | null}
      >
        <MobileBar user={userInfo} />
        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
      </Sidebar>
    </AccountThemeShell>
  );
}
