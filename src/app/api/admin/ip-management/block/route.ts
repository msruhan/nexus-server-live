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

  const conflict = await prisma.ipWhitelistEntry.findUnique({ where: { ip } });
  if (conflict) {
    return apiError('This IP is on the API whitelist. Remove it from the whitelist before blocking.');
  }

  try {
    const row = await prisma.ipBlockEntry.create({
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
      action: 'ip.block_added',
      entity: 'IpBlockEntry',
      entityId: row.id,
      metadata: { ip: row.ip },
    });
    return apiSuccess({ entry: row }, 201);
  } catch {
    return apiError('IP already blocked or could not be saved', 409);
  }
}
