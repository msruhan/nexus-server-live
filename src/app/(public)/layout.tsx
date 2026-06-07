import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getSiteSettingsSafe } from '@/lib/site-settings-safe';
import { getLicenseEnforcementState, shouldRedirectToLicenseSuspended } from '@/lib/license-state';
import { auth } from '@/auth';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { ScrollProgress } from '@/components/landing/ScrollProgress';
import { guardAgainstBlockedIp } from '@/lib/ip-block-guard';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettingsSafe();
  return {
    title: settings?.metaTitle ?? `${settings?.siteName ?? 'Recovero'} — ${settings?.siteTagline ?? 'Unlock Service Portal'}`,
    description: settings?.metaDescription ?? undefined,
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  await guardAgainstBlockedIp();

  const settings = await getSiteSettingsSafe();
  const session = await auth();
  const role = session?.user?.role as string | undefined;

  const pathname = (await headers()).get('x-pathname') ?? '';
  const licenseState = await getLicenseEnforcementState();
  if (shouldRedirectToLicenseSuspended(licenseState, pathname)) {
    redirect('/license-suspended');
  }

  if (settings?.maintenanceMode) {
    if (role !== 'ADMIN' && role !== 'SUB_ADMIN') {
      redirect('/maintenance');
    }
  }

  return (
    <main className="relative">
      <ScrollProgress />
      <Navbar />
      {children}
      <Footer />
    </main>
  );
}
