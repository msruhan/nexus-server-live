import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { SettingsForm } from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });

  return (
    <div className="max-w-3xl">
      <PageHeader
        section="§ Admin · Settings"
        title={
          <>
            Control center <span className="font-serif italic font-normal">configuration</span>.
          </>
        }
        subtitle="Global site settings, feature flags, and brand."
      />

      <SettingsForm
        initial={{
          siteName: settings?.siteName ?? 'Recovero',
          siteTagline: settings?.siteTagline ?? '',
          primaryColor: settings?.primaryColor ?? '#2f63ff',
          logoUrl: settings?.logoUrl ?? '',
          faviconUrl: settings?.faviconUrl ?? '',
          supportEmail: settings?.supportEmail ?? '',
          brandShowPoweredBy: settings?.brandShowPoweredBy ?? true,
          brandInvoicePrefix: settings?.brandInvoicePrefix ?? 'INV',
          copyrightText: settings?.copyrightText ?? '',
          enableRegistration: settings?.enableRegistration ?? true,
          enableDirectPayment: settings?.enableDirectPayment ?? false,
          maintenanceMode: settings?.maintenanceMode ?? false,
          maintenanceMessage: settings?.maintenanceMessage ?? '',
          enforceAdmin2FA: settings?.enforceAdmin2FA ?? false,
          metaTitle: settings?.metaTitle ?? '',
          metaDescription: settings?.metaDescription ?? '',
          socialInstagram: settings?.socialInstagram ?? '',
          socialWhatsapp: settings?.socialWhatsapp ?? '',
          socialTelegram: settings?.socialTelegram ?? '',
          footerText: settings?.footerText ?? '',
        }}
      />
    </div>
  );
}
