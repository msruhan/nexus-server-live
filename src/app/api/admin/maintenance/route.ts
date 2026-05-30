import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const schema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceTitle: z.string().trim().max(120).optional().nullable(),
  maintenanceMessage: z.string().trim().max(2000).optional().nullable(),
  maintenanceTemplate: z.enum(['aurora', 'grid', 'orbit', 'minimal']).optional(),
  // ISO datetime string or empty/null to clear.
  maintenanceEndsAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;
  const s = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      maintenanceMode: true,
      maintenanceTitle: true,
      maintenanceMessage: true,
      maintenanceTemplate: true,
      maintenanceEndsAt: true,
    },
  });
  return apiSuccess({
    ...s,
    maintenanceEndsAt: s?.maintenanceEndsAt ? s.maintenanceEndsAt.toISOString() : null,
  });
}

export async function PUT(req: Request) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  const data: Record<string, unknown> = {};
  if (typeof parsed.data.maintenanceMode === 'boolean') data.maintenanceMode = parsed.data.maintenanceMode;
  if ('maintenanceTitle' in parsed.data) data.maintenanceTitle = parsed.data.maintenanceTitle;
  if ('maintenanceMessage' in parsed.data) data.maintenanceMessage = parsed.data.maintenanceMessage;
  if (parsed.data.maintenanceTemplate) data.maintenanceTemplate = parsed.data.maintenanceTemplate;
  if ('maintenanceEndsAt' in parsed.data) {
    data.maintenanceEndsAt = parsed.data.maintenanceEndsAt
      ? new Date(parsed.data.maintenanceEndsAt)
      : null;
  }

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  });

  await logActivity({
    userId: session.user.id,
    action: data.maintenanceMode === true
      ? 'maintenance.enabled'
      : data.maintenanceMode === false
        ? 'maintenance.disabled'
        : 'maintenance.updated',
    entity: 'SiteSettings',
    metadata: { changed: Object.keys(data) },
  });

  return apiSuccess({ ok: true });
}
