import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import { makeApiKey } from '@/lib/api-key-auth';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().trim().min(2).max(64),
  apiUsername: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9._-]{2,31}$/, 'Username must be 3-32 chars (a-z, 0-9, dot, underscore, dash)'),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export async function GET() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const rows = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      apiUsername: true,
      keyPrefix: true,
      scopes: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      // Security summary (additive — old clients ignore unknown fields).
      ipMode: true,
      lockedIp: true,
      lockedAt: true,
      rateLimitPerMinute: true,
      rateLimitPerHour: true,
      throttleUntil: true,
    },
  });
  return apiSuccess(rows);
}

export async function POST(req: Request) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

    const { plain, prefix, hash } = makeApiKey();
    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const created = await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        apiUsername: parsed.data.apiUsername,
        keyPrefix: prefix,
        keyHash: hash,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        apiUsername: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return apiSuccess(
      {
        ...created,
        plainKey: plain,
      },
      201,
    );
  } catch (e) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return apiError('API username already used. Pick another one.', 409);
    }
    console.error('[USER_API_KEYS_POST]', e);
    return apiError('Failed to create API key', 500);
  }
}
