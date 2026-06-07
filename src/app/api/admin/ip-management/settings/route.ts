import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';
import { invalidateGlobalIpPolicyCache } from '@/lib/global-ip-policy';
import { requireIpManagementAccess } from '../_access';

export const dynamic = 'force-dynamic';

const schema = z.object({
  apiIpWhitelistEnforced: z.boolean(),
});

export async function PATCH(req: Request) {
  const session = await requireIpManagementAccess();
  if (!session) return apiError('Forbidden', 403);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', apiIpWhitelistEnforced: parsed.data.apiIpWhitelistEnforced },
    update: { apiIpWhitelistEnforced: parsed.data.apiIpWhitelistEnforced },
  });
  invalidateGlobalIpPolicyCache();
  void logActivity({
    userId: session.user.id,
    action: 'ip.whitelist_policy_updated',
    entity: 'SiteSettings',
    entityId: 'singleton',
    metadata: { apiIpWhitelistEnforced: parsed.data.apiIpWhitelistEnforced },
  });
  return apiSuccess({ apiIpWhitelistEnforced: parsed.data.apiIpWhitelistEnforced });
}
