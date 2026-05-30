import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { Ticker } from '@/components/landing/Ticker';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { ScrollProgress } from '@/components/landing/ScrollProgress';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  return {
    title: settings?.metaTitle ?? `${settings?.siteName ?? 'Nexus Server'} — ${settings?.siteTagline ?? 'IMEI & Server Bureau'}`,
    description: settings?.metaDescription ?? undefined,
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  if (settings?.maintenanceMode) {
    const session = await auth();
    const role = session?.user.role;
    if (role !== 'ADMIN' && role !== 'SUB_ADMIN') {
      redirect('/maintenance');
    }
  }

  return (
    <main className="relative">
      <ScrollProgress />
      <Ticker />
      <Navbar />
      {children}
      <Footer />
    </main>
  );
}
