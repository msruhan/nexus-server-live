import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasPermission, type PermissionKey } from '@/lib/sub-admin';

/**
 * Server-side page guard for admin pages.
 *
 * Call at the top of an admin page's default export to gate access:
 *   await requirePermission('viewImeiOrders');
 *
 * Behavior:
 *   - Not logged in → redirect to /login
 *   - USER role → redirect to /user/dashboard
 *   - ADMIN role → always allowed
 *   - SUB_ADMIN → allowed only if they have the permission; otherwise
 *     redirected to /admin/dashboard (their landing page) with a notice.
 *
 * If a SUB_ADMIN lacks even viewDashboard, they get a minimal access page.
 */
export async function requirePermission(permission: PermissionKey): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/admin/dashboard');

  const role = session.user.role as string;
  if (role === 'ADMIN') return; // full access
  if (role !== 'SUB_ADMIN') redirect('/user/dashboard');

  const allowed = await hasPermission(session.user.id, role, permission);
  if (!allowed) {
    redirect('/admin/no-access');
  }
}

/**
 * Returns the caller's role + a permission checker, for pages that need
 * to conditionally render sections rather than block the whole page.
 */
export async function getAccessContext() {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/admin/dashboard');
  const role = session.user.role as string;
  const userId = session.user.id;
  return {
    role,
    userId,
    isAdmin: role === 'ADMIN',
    isSubAdmin: role === 'SUB_ADMIN',
    async can(permission: PermissionKey) {
      return hasPermission(userId, role, permission);
    },
  };
}
