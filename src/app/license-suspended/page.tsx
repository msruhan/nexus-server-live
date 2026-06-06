import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getLicenseEnforcementState } from '@/lib/license-state';
import { MaintenanceView } from '@/components/maintenance/MaintenanceView';
import type { MaintenanceTemplateId } from '@/components/maintenance/types';

export const dynamic = 'force-dynamic';

/**
 * Shown when license runtime is locked (hold, revoked, etc.).
 * Public-facing copy matches operational maintenance — no subscription/vendor wording.
 */
export default async function LicenseSuspendedPage() {
  const [state, session, settings] = await Promise.all([
    getLicenseEnforcementState(),
    auth(),
    prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        siteName: true,
        maintenanceTitle: true,
        maintenanceMessage: true,
        maintenanceTemplate: true,
        maintenanceEndsAt: true,
      },
    }),
  ]);

  const role = session?.user?.role as string | undefined;
  const isVendorAdmin = role === 'ADMIN' || role === 'SUB_ADMIN';

  if (!state.activated || state.runtimeAllowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper">
        <div className="text-center">
          <p className="font-serif italic text-ink-muted">The site is available.</p>
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

  const siteName = settings?.siteName?.trim() || 'Recovero';
  const title = settings?.maintenanceTitle?.trim() || 'Back in a moment.';
  const message =
    settings?.maintenanceMessage?.trim() ||
    'We are performing scheduled maintenance to improve your experience. The platform will be back online shortly. Thank you for your patience.';
  const template = (settings?.maintenanceTemplate || 'aurora') as MaintenanceTemplateId;
  const endsAt = settings?.maintenanceEndsAt ? settings.maintenanceEndsAt.toISOString() : null;

  return (
    <main className="relative min-h-screen bg-paper">
      <MaintenanceView
        template={template}
        siteName={siteName}
        title={title}
        message={message}
        endsAt={endsAt}
      />
      {isVendorAdmin ? (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 pb-6 text-center">
          <Link
            href="/admin/system"
            className="pointer-events-auto inline-flex rounded-full border border-line/80 bg-paper/90 px-4 py-2 text-xs font-medium text-ink-muted shadow-sm backdrop-blur transition-colors hover:border-ink hover:text-ink"
          >
            Admin · System & license
          </Link>
        </div>
      ) : null}
    </main>
  );
}
