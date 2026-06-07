import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';
import { invalidateGlobalIpPolicyCache, normalizeIpEntry } from '@/lib/global-ip-policy';
import { requireIpManagementAccess } from '../_access';

export const dynamic = 'force-dynamic';

const schema = z.object({
  ip: z.string().min(3).max(64),
  label: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await requireIpManagementAccess();
  if (!session) return apiError('Forbidden', 403);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const ip = normalizeIpEntry(parsed.data.ip);
  if (!ip) return apiError('Invalid IP or CIDR notation');

  const conflict = await prisma.ipBlockEntry.findUnique({ where: { ip } });
  if (conflict) {
    return apiError('This IP is blocked. Remove it from IP Block before whitelisting.');
  }

  try {
    const row = await prisma.ipWhitelistEntry.create({
      data: {
        ip,
        label: parsed.data.label?.trim() || null,
        note: parsed.data.note?.trim() || null,
        createdBy: session.user.email ?? session.user.id,
      },
    });
    invalidateGlobalIpPolicyCache();
    void logActivity({
      userId: session.user.id,
      action: 'ip.whitelist_added',
      entity: 'IpWhitelistEntry',
      entityId: row.id,
      metadata: { ip: row.ip },
    });
    return apiSuccess({ entry: row }, 201);
  } catch {
    return apiError('IP already whitelisted or could not be saved', 409);
  }
}
