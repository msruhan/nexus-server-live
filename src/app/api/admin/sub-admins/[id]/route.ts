import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireStrictAdmin } from '@/lib/api-auth';
import { allPermissionKeys, type PermissionKey } from '@/lib/sub-admin';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/sub-admins/:id
 * Get a sub-admin's permissions.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireStrictAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const user = await prisma.user.findFirst({
    where: { id, role: 'SUB_ADMIN' },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      subAdminPermissions: true,
    },
  });
  if (!user) return apiError('Sub-admin not found', 404);
  return apiSuccess(user);
}

/**
 * PATCH /api/admin/sub-admins/:id
 * Update permissions for a sub-admin. Body is a partial object of permission keys → boolean.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireStrictAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const user = await prisma.user.findFirst({
    where: { id, role: 'SUB_ADMIN' },
    select: { id: true, email: true },
  });
  if (!user) return apiError('Sub-admin not found', 404);

  const body = await req.json();
  const validKeys = allPermissionKeys();
  const data: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(body)) {
    if (validKeys.includes(key as PermissionKey) && typeof value === 'boolean') {
      data[key] = value;
    }
  }
  if (Object.keys(data).length === 0) return apiError('No valid permissions provided');

  await prisma.subAdminPermission.upsert({
    where: { userId: id },
    update: data,
    create: { userId: id, ...data },
  });

  await logActivity({
    userId: session.user.id,
    action: 'sub_admin.permissions_updated',
    entity: 'User',
    entityId: id,
    metadata: { email: user.email, changed: Object.keys(data) },
  });

  return apiSuccess({ updated: true });
}

/**
 * DELETE /api/admin/sub-admins/:id
 * Revoke sub-admin role — demote back to USER.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireStrictAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const user = await prisma.user.findFirst({
    where: { id, role: 'SUB_ADMIN' },
    select: { id: true, email: true },
  });
  if (!user) return apiError('Sub-admin not found', 404);

  await prisma.$transaction([
    prisma.subAdminPermission.deleteMany({ where: { userId: id } }),
    prisma.user.update({ where: { id }, data: { role: 'USER' } }),
  ]);

  await logActivity({
    userId: session.user.id,
    action: 'sub_admin.revoked',
    entity: 'User',
    entityId: id,
    metadata: { email: user.email },
  });

  return apiSuccess({ revoked: true });
}
