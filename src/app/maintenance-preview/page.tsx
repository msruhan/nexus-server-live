import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { MaintenanceView } from '@/components/maintenance/MaintenanceView';
import type { MaintenanceTemplateId } from '@/components/maintenance/types';

export const dynamic = 'force-dynamic';

const VALID: MaintenanceTemplateId[] = ['aurora', 'grid', 'orbit', 'minimal'];

/**
 * Admin-only preview of a maintenance template, without enabling
 * maintenance mode site-wide. Uses the current configured content.
 */
export default async function MaintenancePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (role !== 'ADMIN' && role !== 'SUB_ADMIN') redirect('/login');

  const params = await searchParams;
  const template = (VALID.includes(params.template as MaintenanceTemplateId)
    ? params.template
    : 'aurora') as MaintenanceTemplateId;

  const s = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      siteName: true,
      maintenanceTitle: true,
      maintenanceMessage: true,
      maintenanceEndsAt: true,
    },
  });

  return (
    <MaintenanceView
      template={template}
      siteName={s?.siteName || 'Recovero'}
      title={s?.maintenanceTitle?.trim() || 'Back in a moment.'}
      message={
        s?.maintenanceMessage?.trim() ||
        'We are performing scheduled maintenance to improve your experience. The platform will be back online shortly.'
      }
      endsAt={s?.maintenanceEndsAt ? s.maintenanceEndsAt.toISOString() : null}
    />
  );
}
