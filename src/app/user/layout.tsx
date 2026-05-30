import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileBar } from '@/components/dashboard/MobileBar';
import { AccountThemeShell } from '@/components/appearance/AccountThemeShell';

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
  if (settings?.maintenanceMode) {
    redirect('/maintenance');
  }

  const userInfo = {
    name: session.user.name ?? 'User',
    email: session.user.email ?? '',
    role: session.user.role,
  };

  return (
    <AccountThemeShell userId={session.user.id}>
      <Sidebar variant="user" user={userInfo}>
        <MobileBar user={userInfo} />
        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
      </Sidebar>
    </AccountThemeShell>
  );
}
