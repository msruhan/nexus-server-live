import { apiError, apiSuccess } from '@/lib/api-auth';
import { getIpPolicyAdminSnapshot } from '@/lib/global-ip-policy';
import { requireIpManagementAccess } from './_access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await requireIpManagementAccess();
  if (!session) return apiError('Forbidden', 403);

  const data = await getIpPolicyAdminSnapshot();
  return apiSuccess({
    blocked: data.blocked.map(serializeEntry),
    whitelisted: data.whitelisted.map(serializeEntry),
    apiIpWhitelistEnforced: data.apiIpWhitelistEnforced,
  });
}

function serializeEntry(e: {
  id: string;
  ip: string;
  label: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: Date;
  userId?: string | null;
  user?: { id: string; email: string; name: string } | null;
}) {
  return {
    id: e.id,
    ip: e.ip,
    label: e.label,
    note: e.note,
    createdBy: e.createdBy,
    createdAt: e.createdAt.toISOString(),
    userId: e.userId ?? null,
    ownerEmail: e.user?.email ?? null,
    ownerName: e.user?.name ?? null,
  };
}
