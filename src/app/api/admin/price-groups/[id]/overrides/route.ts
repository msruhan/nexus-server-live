import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const createSchema = z
  .object({
    kind: z.enum(['imei', 'server']),
    serviceId: z.string().cuid(),
    price: z.number().positive().max(1_000_000),
  })
  .strict();

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const group = await prisma.priceGroup.findUnique({ where: { id }, select: { id: true } });
  if (!group) return apiError('Group not found', 404);

  const rows = await prisma.servicePriceOverride.findMany({
    where: { priceGroupId: id },
    orderBy: { createdAt: 'desc' },
  });

  const imeiIds = rows.map((r) => r.imeiServiceId).filter(Boolean) as string[];
  const serverIds = rows.map((r) => r.serverServiceId).filter(Boolean) as string[];

  const [imeiServices, serverServices] = await Promise.all([
    imeiIds.length
      ? prisma.imeiService.findMany({
          where: { id: { in: imeiIds } },
          select: { id: true, title: true, toolId: true, price: true },
        })
      : Promise.resolve([]),
    serverIds.length
      ? prisma.serverService.findMany({
          where: { id: { in: serverIds } },
          select: { id: true, title: true, toolId: true, price: true },
        })
      : Promise.resolve([]),
  ]);

  const imeiMap = new Map(imeiServices.map((s) => [s.id, s]));
  const serverMap = new Map(serverServices.map((s) => [s.id, s]));

  return apiSuccess(
    rows.map((r) => {
      const imei = r.imeiServiceId ? imeiMap.get(r.imeiServiceId) : null;
      const server = r.serverServiceId ? serverMap.get(r.serverServiceId) : null;
      return {
        id: r.id,
        kind: r.imeiServiceId ? ('imei' as const) : ('server' as const),
        serviceId: r.imeiServiceId ?? r.serverServiceId,
        serviceTitle: imei?.title ?? server?.title ?? '—',
        serviceRef: imei?.toolId ?? server?.toolId ?? null,
        retailPrice: Number(imei?.price ?? server?.price ?? 0),
        price: Number(r.price),
      };
    }),
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  const group = await prisma.priceGroup.findUnique({ where: { id } });
  if (!group) return apiError('Group not found', 404);

  const { kind, serviceId, price } = parsed.data;

  if (kind === 'imei') {
    const svc = await prisma.imeiService.findUnique({ where: { id: serviceId } });
    if (!svc) return apiError('IMEI service not found', 404);
    const created = await prisma.servicePriceOverride.upsert({
      where: { priceGroupId_imeiServiceId: { priceGroupId: id, imeiServiceId: serviceId } },
      create: { priceGroupId: id, imeiServiceId: serviceId, price },
      update: { price },
    });
    await logActivity({
      userId: session.user.id,
      action: 'price_group.override_set',
      entity: 'ServicePriceOverride',
      entityId: created.id,
      metadata: { priceGroupId: id, kind, serviceId, price },
    });
    return apiSuccess(created, 201);
  }

  const svc = await prisma.serverService.findUnique({ where: { id: serviceId } });
  if (!svc) return apiError('Server service not found', 404);
  const created = await prisma.servicePriceOverride.upsert({
    where: { priceGroupId_serverServiceId: { priceGroupId: id, serverServiceId: serviceId } },
    create: { priceGroupId: id, serverServiceId: serviceId, price },
    update: { price },
  });
  await logActivity({
    userId: session.user.id,
    action: 'price_group.override_set',
    entity: 'ServicePriceOverride',
    entityId: created.id,
    metadata: { priceGroupId: id, kind, serviceId, price },
  });
  return apiSuccess(created, 201);
}
