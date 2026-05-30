import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { PERMISSION_GROUPS } from '@/lib/sub-admin';
import { SubAdminManager } from './SubAdminManager';

export const dynamic = 'force-dynamic';

export default async function AdminSubAdminsPage() {
  const [subAdmins, allUsers] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'SUB_ADMIN' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        subAdminPermissions: true,
      },
    }),
    // Users eligible to be promoted (active USERs only).
    prisma.user.findMany({
      where: { role: 'USER', isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        section="§ Admin · access control"
        title={
          <>
            Sub <span className="font-serif italic font-normal">admins</span>.
          </>
        }
        subtitle="Assign users as sub-admins with granular permissions. Only full admins can manage this page."
      />
      <SubAdminManager
        subAdmins={subAdmins.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          isActive: u.isActive,
          permissions: u.subAdminPermissions ?? null,
        }))}
        eligibleUsers={allUsers}
        permissionGroups={PERMISSION_GROUPS}
      />
    </div>
  );
}
