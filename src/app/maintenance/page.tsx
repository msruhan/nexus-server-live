import Link from 'next/link';
import { prisma } from '@/lib/db';
import { MaintenanceView } from '@/components/maintenance/MaintenanceView';
import type { MaintenanceTemplateId } from '@/components/maintenance/types';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });

  if (!settings?.maintenanceMode) {
    // Maintenance ended — offer a way back.
    return (
      <main className="grid min-h-screen place-items-center bg-paper">
        <div className="text-center">
          <p className="font-serif italic text-ink-muted">Maintenance has ended.</p>
          <Link
            href="/"
            className="mt-4 inline-block font-mono text-xs uppercase tracking-wider text-ink hover:underline"
          >
            Continue to site →
          </Link>
        </div>
      </main>
    );
  }

  const siteName = settings.siteName || 'Recovero';
  const title = settings.maintenanceTitle?.trim() || 'Back in a moment.';
  const message =
    settings.maintenanceMessage?.trim() ||
    'We are performing scheduled maintenance to improve your experience. The platform will be back online shortly.';
  const template = (settings.maintenanceTemplate || 'aurora') as MaintenanceTemplateId;
  const endsAt = settings.maintenanceEndsAt ? settings.maintenanceEndsAt.toISOString() : null;

  return (
    <MaintenanceView
      template={template}
      siteName={siteName}
      title={title}
      message={message}
      endsAt={endsAt}
    />
  );
}
