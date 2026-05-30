import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { MaintenanceManager } from './MaintenanceManager';

export const dynamic = 'force-dynamic';

export default async function AdminMaintenancePage() {
  const s = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      maintenanceMode: true,
      maintenanceTitle: true,
      maintenanceMessage: true,
      maintenanceTemplate: true,
      maintenanceEndsAt: true,
    },
  });

  return (
    <div className="max-w-5xl">
      <PageHeader
        section="§ Admin · system"
        title={
          <>
            Maintenance <span className="font-serif italic font-normal">mode</span>.
          </>
        }
        subtitle="Take the site offline for visitors and members. Admins and sub-admins keep full access."
      />
      <MaintenanceManager
        initial={{
          maintenanceMode: s?.maintenanceMode ?? false,
          maintenanceTitle: s?.maintenanceTitle ?? '',
          maintenanceMessage: s?.maintenanceMessage ?? '',
          maintenanceTemplate: (s?.maintenanceTemplate ?? 'aurora') as
            | 'aurora'
            | 'grid'
            | 'orbit'
            | 'minimal',
          maintenanceEndsAt: s?.maintenanceEndsAt ? s.maintenanceEndsAt.toISOString() : '',
        }}
      />
    </div>
  );
}
