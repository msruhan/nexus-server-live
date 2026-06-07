import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';
import { invalidateGlobalIpPolicyCache } from '@/lib/global-ip-policy';
import { requireIpManagementAccess } from '../../_access';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireIpManagementAccess();
  if (!session) return apiError('Forbidden', 403);

  const { id } = await context.params;
  const existing = await prisma.ipWhitelistEntry.findUnique({ where: { id } });
  if (!existing) return apiError('Entry not found', 404);

  await prisma.ipWhitelistEntry.delete({ where: { id } });
  invalidateGlobalIpPolicyCache();
  void logActivity({
    userId: session.user.id,
    action: 'ip.whitelist_removed',
    entity: 'IpWhitelistEntry',
    entityId: id,
    metadata: { ip: existing.ip },
  });
  return apiSuccess({ deleted: true });
}
