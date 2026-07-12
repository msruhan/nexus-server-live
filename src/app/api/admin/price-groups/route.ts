import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';
import { serializePriceGroup } from '@/lib/price-group';

export const dynamic = 'force-dynamic';

const adjustmentTypeSchema = z.enum(['PERCENT', 'FIXED']);

const createSchema = z
  .object({
    name: z.string().trim().min(2).max(64),
    description: z.string().trim().max(1000).optional().nullable(),
    defaultEnabled: z.boolean().optional(),
    adjustmentType: adjustmentTypeSchema.default('PERCENT'),
    discountPercent: z.number().min(0).max(50).optional(),
    fixedAdjustment: z.number().min(-100000).max(100000).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.defaultEnabled === false) return;
    if (data.adjustmentType === 'PERCENT' && data.discountPercent === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Discount % is required', path: ['discountPercent'] });
    }
    if (data.adjustmentType === 'FIXED' && data.fixedAdjustment === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Fixed adjustment is required', path: ['fixedAdjustment'] });
    }
  });

export async function GET() {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const rows = await prisma.priceGroup.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      adjustmentType: true,
      discountPercent: true,
      fixedAdjustment: true,
      defaultEnabled: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      _count: { select: { users: true, rules: true } },
    },
  });
  return apiSuccess(rows.map(serializePriceGroup));
}

export async function POST(req: Request) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  try {
    const isPercent = parsed.data.adjustmentType === 'PERCENT';
    const created = await prisma.priceGroup.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        defaultEnabled: parsed.data.defaultEnabled ?? true,
        adjustmentType: parsed.data.adjustmentType,
        discountPercent: isPercent ? (parsed.data.discountPercent ?? 0) : 0,
        fixedAdjustment: isPercent ? 0 : (parsed.data.fixedAdjustment ?? 0),
        isActive: parsed.data.isActive ?? true,
      },
    });
    await logActivity({
      userId: session.user.id,
      action: 'price_group.created',
      entity: 'PriceGroup',
      entityId: created.id,
      metadata: { name: created.name },
    });
    return apiSuccess(created, 201);
  } catch (e) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return apiError('A group with that name already exists.', 409);
    }
    console.error('[ADMIN_PRICE_GROUPS_POST]', e);
    return apiError('Failed to create group', 500);
  }
}
