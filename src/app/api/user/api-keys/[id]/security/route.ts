import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';
import { normalizeIp } from '@/lib/ip-utils';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/user/api-keys/:id/security
 *   Read security settings for a key (owned by caller).
 *
 * PATCH /api/user/api-keys/:id/security
 *   Update security policy. All fields are optional. Updates only the
 *   provided fields, leaving others as-is. Side-effects:
 *     - Switching ipMode to "lock_first" clears any old locked IP so the
 *       next request rebinds (intentional UX: user can "reset" by toggling).
 *     - Switching ipMode to "none" or "allowlist" also clears the old lock
 *       to avoid stale state.
 *
 * Defensive notes:
 *   - This endpoint never touches the API key value or username.
 *   - It never disables an existing key — that has its own PATCH route.
 */

const ipModeSchema = z.enum(['none', 'allowlist', 'lock_first']);

const ipListSchema = z
  .string()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return null;
    const list = v
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) return null;
    // Light validation: each entry must be IP, IP/CIDR, or plain IPv6.
    for (const entry of list) {
      const [base, bits] = entry.includes('/') ? entry.split('/') : [entry, undefined];
      if (!normalizeIp(base)) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            path: ['allowedIps'],
            message: `Invalid IP entry: ${entry}`,
          },
        ]);
      }
      if (bits !== undefined && !/^\d{1,3}$/.test(bits)) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            path: ['allowedIps'],
            message: `Invalid CIDR bits: ${entry}`,
          },
        ]);
      }
    }
    return list.join(',');
  });

const patchSchema = z
  .object({
    ipMode: ipModeSchema.optional(),
    allowedIps: ipListSchema,
    rateLimitPerMinute: z
      .union([z.number().int().min(0).max(10_000), z.null()])
      .optional(),
    rateLimitPerHour: z
      .union([z.number().int().min(0).max(1_000_000), z.null()])
      .optional(),
    spendLimitPerHour: z
      .union([z.number().int().min(0).max(1_000_000_000_000), z.null()])
      .optional(),
    spendLimitPerDay: z
      .union([z.number().int().min(0).max(1_000_000_000_000), z.null()])
      .optional(),
    maxOrdersPerHour: z
      .union([z.number().int().min(0).max(100_000), z.null()])
      .optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No changes provided' });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await ctx.params;
  const key = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      ipMode: true,
      allowedIps: true,
      lockedIp: true,
      lockedAt: true,
      lockedByUa: true,
      rateLimitPerMinute: true,
      rateLimitPerHour: true,
      spendLimitPerHour: true,
      spendLimitPerDay: true,
      maxOrdersPerHour: true,
      consecutiveFails: true,
      throttleUntil: true,
    },
  });
  if (!key) return apiError('API key not found', 404);

  return apiSuccess({
    ...key,
    spendLimitPerHour: key.spendLimitPerHour?.toString() ?? null,
    spendLimitPerDay: key.spendLimitPerDay?.toString() ?? null,
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await ctx.params;
  let parsed;
  try {
    parsed = patchSchema.safeParse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return apiError(e.issues[0]?.message ?? 'Invalid payload');
    }
    throw e;
  }
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');
  }

  const current = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, ipMode: true },
  });
  if (!current) return apiError('API key not found', 404);

  const data: Record<string, unknown> = {};
  if (parsed.data.ipMode !== undefined) {
    data.ipMode = parsed.data.ipMode;
    // When switching IP mode, clear any stale lock so the new policy
    // starts from a clean slate.
    if (parsed.data.ipMode !== current.ipMode) {
      data.lockedIp = null;
      data.lockedAt = null;
      data.lockedByUa = null;
    }
  }
  if ('allowedIps' in parsed.data) data.allowedIps = parsed.data.allowedIps;
  if ('rateLimitPerMinute' in parsed.data) data.rateLimitPerMinute = parsed.data.rateLimitPerMinute;
  if ('rateLimitPerHour' in parsed.data) data.rateLimitPerHour = parsed.data.rateLimitPerHour;
  if ('spendLimitPerHour' in parsed.data) data.spendLimitPerHour = parsed.data.spendLimitPerHour;
  if ('spendLimitPerDay' in parsed.data) data.spendLimitPerDay = parsed.data.spendLimitPerDay;
  if ('maxOrdersPerHour' in parsed.data) data.maxOrdersPerHour = parsed.data.maxOrdersPerHour;

  const updated = await prisma.apiKey.update({
    where: { id },
    data,
    select: {
      id: true,
      ipMode: true,
      allowedIps: true,
      lockedIp: true,
      lockedAt: true,
      rateLimitPerMinute: true,
      rateLimitPerHour: true,
      spendLimitPerHour: true,
      spendLimitPerDay: true,
      maxOrdersPerHour: true,
    },
  });

  await logActivity({
    userId: session.user.id,
    action: 'api_key.security_updated',
    entity: 'ApiKey',
    entityId: id,
    metadata: { changed: Object.keys(data) },
  });

  return apiSuccess({
    ...updated,
    spendLimitPerHour: updated.spendLimitPerHour?.toString() ?? null,
    spendLimitPerDay: updated.spendLimitPerDay?.toString() ?? null,
  });
}
