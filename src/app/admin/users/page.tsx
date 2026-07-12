import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { UsersTable } from './UsersTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const [users, groups] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        wallet: true,
        priceGroup: { select: { id: true, name: true } },
        _count: { select: { imeiOrders: true, serverOrders: true } },
      },
    }),
    prisma.priceGroup.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        section="§ Admin · Users"
        title={
          <>
            All <span className="font-serif italic font-normal">members</span>.
          </>
        }
        subtitle="Assign user groups · add wallet credit · resend verification emails · manage activation status."
      />

      <UsersTable
        groups={groups}
        rows={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          wallet: Number(u.wallet?.balance ?? 0),
          orders: u._count.imeiOrders + u._count.serverOrders,
          joined: u.createdAt,
          active: u.isActive,
          emailVerifiedAt: u.emailVerifiedAt,
          emailVerificationToken: u.emailVerificationToken,
          groupId: u.priceGroupId ?? '',
          group: u.priceGroup?.name ?? 'Retail',
        }))}
      />
    </div>
  );
}
