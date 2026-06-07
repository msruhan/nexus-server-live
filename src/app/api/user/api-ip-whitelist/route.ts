import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';
import {
  invalidateGlobalIpPolicyCache,
  normalizeIpEntry,
  USER_API_IP_WHITELIST_LIMIT,
} from '@/lib/global-ip-policy';

export const dynamic = 'force-dynamic';

const postSchema = z.object({
  ip: z.string().min(3).max(64),
  label: z.string().max(120).optional(),
});

export async function GET() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const entry = await prisma.ipWhitelistEntry.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      ip: true,
      label: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return apiSuccess({
    entry: entry
      ? { ...entry, createdAt: entry.createdAt.toISOString(), updatedAt: entry.updatedAt.toISOString() }
      : null,
    limit: USER_API_IP_WHITELIST_LIMIT,
  });
}

export async function POST(req: Request) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const existing = await prisma.ipWhitelistEntry.findUnique({
    where: { userId: session.user.id },
    select: { id: true, ip: true },
  });
  if (existing) {
    return apiError(
      `You already whitelisted ${existing.ip}. Reset your current IP before registering a new one.`,
      409,
    );
  }

  const ip = normalizeIpEntry(parsed.data.ip);
  if (!ip) return apiError('Invalid IP or CIDR notation');

  const blocked = await prisma.ipBlockEntry.findUnique({ where: { ip } });
  if (blocked) {
    return apiError('This IP is blocked site-wide. Contact the administrator.');
  }

  try {
    const row = await prisma.ipWhitelistEntry.create({
      data: {
        ip,
        label: parsed.data.label?.trim() || null,
        userId: session.user.id,
        createdBy: session.user.email ?? session.user.id,
      },
      select: {
        id: true,
        ip: true,
        label: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    invalidateGlobalIpPolicyCache();
    void logActivity({
      userId: session.user.id,
      action: 'ip.user_whitelist_added',
      entity: 'IpWhitelistEntry',
      entityId: row.id,
      metadata: { ip: row.ip },
    });
    return apiSuccess(
      {
        entry: {
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      },
      201,
    );
  } catch {
    return apiError('This IP is already whitelisted by another account or administrator.', 409);
  }
}

/** Reset — remove the user's whitelisted IP so they can register a new one. */
export async function DELETE() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const existing = await prisma.ipWhitelistEntry.findUnique({
    where: { userId: session.user.id },
    select: { id: true, ip: true },
  });
  if (!existing) return apiError('No whitelisted IP to reset.', 404);

  await prisma.ipWhitelistEntry.delete({ where: { id: existing.id } });
  invalidateGlobalIpPolicyCache();
  void logActivity({
    userId: session.user.id,
    action: 'ip.user_whitelist_reset',
    entity: 'IpWhitelistEntry',
    entityId: existing.id,
    metadata: { ip: existing.ip },
  });

  return apiSuccess({ deleted: true });
}
