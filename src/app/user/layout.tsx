import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileBar } from '@/components/dashboard/MobileBar';
import { AccountThemeShell } from '@/components/appearance/AccountThemeShell';
import { getBranding } from '@/lib/branding';
import { getLicenseEnforcementState, shouldRedirectToLicenseSuspended } from '@/lib/license-state';

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/user/dashboard');
  // ADMIN and SUB_ADMIN belong in the admin panel, not the member desk.
  const role = session.user.role as string;
  if (role === 'ADMIN' || role === 'SUB_ADMIN') redirect('/admin/dashboard');

  // Maintenance mode — regular users are sent to the maintenance page.
  // Admins / sub-admins are already redirected above so they keep working.
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { maintenanceMode: true },
  });
  const pathname = (await headers()).get('x-pathname') ?? '';
  const licenseState = await getLicenseEnforcementState();
  if (shouldRedirectToLicenseSuspended(licenseState, pathname)) {
    redirect('/license-suspended');
  }

  if (settings?.maintenanceMode) {
    redirect('/maintenance');
  }

  const userInfo = {
    name: session.user.name ?? 'User',
    email: session.user.email ?? '',
    role: session.user.role,
  };

  const brand = await getBranding();

  return (
    <AccountThemeShell userId={session.user.id}>
      <Sidebar variant="user" user={userInfo} brand={{ siteName: brand.siteName, logoUrl: brand.logoUrl }}>
        <MobileBar user={userInfo} />
        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
      </Sidebar>
    </AccountThemeShell>
  );
}
