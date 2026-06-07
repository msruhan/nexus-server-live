import { auth } from '@/auth';
import { hasPermission } from '@/lib/sub-admin';

export async function requireIpManagementAccess() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role ?? 'USER';
  if (role !== 'ADMIN' && role !== 'SUB_ADMIN') return null;
  if (role === 'SUB_ADMIN') {
    const allowed = await hasPermission(session.user.id, role, 'manageApiKeys');
    if (!allowed) return null;
  }
  return session;
}
