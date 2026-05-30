import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireStrictAdmin } from '@/lib/api-auth';
import { allPermissionKeys, type PermissionKey } from '@/lib/sub-admin';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/sub-admins
 * List all sub-admin users with their permissions.
 */
export async function GET() {
  const { error } = await requireStrictAdmin();
  if (error) return error;

  const subAdmins = await prisma.user.findMany({
    where: { role: 'SUB_ADMIN' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      subAdminPermissions: true,
    },
  });

  return apiSuccess(subAdmins);
}

const promoteSchema = z.object({
  userId: z.string().cuid(),
});

/**
 * POST /api/admin/sub-admins
 * Promote a USER to SUB_ADMIN role and create their permission record.
 */
export async function POST(req: Request) {
  const { session, error } = await requireStrictAdmin();
  if (error) return error;

  const parsed = promoteSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true, email: true },
  });
  if (!user) return apiError('User not found', 404);
  if (user.role === 'ADMIN') return apiError('Cannot demote an admin to sub-admin', 400);
  if (user.role === 'SUB_ADMIN') return apiError('User is already a sub-admin', 400);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUB_ADMIN' },
    }),
    prisma.subAdminPermission.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    }),
  ]);

  await logActivity({
    userId: session.user.id,
    action: 'sub_admin.promoted',
    entity: 'User',
    entityId: user.id,
    metadata: { email: user.email },
  });

  return apiSuccess({ promoted: true }, 201);
}
