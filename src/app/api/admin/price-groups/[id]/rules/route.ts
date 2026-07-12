import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';
import {
  formatPriceRuleSummary,
  priceRuleUpsertSchema,
  ruleDataFromPayload,
  ruleValuesFromRow,
} from '@/lib/price-group-rule';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const group = await prisma.priceGroup.findUnique({ where: { id }, select: { id: true } });
  if (!group) return apiError('Group not found', 404);

  const scope = new URL(req.url).searchParams.get('scope');
  const where = {
    priceGroupId: id,
    ...(scope === 'CATALOG_GROUP' || scope === 'SERVICE' ? { scope } : {}),
  };

  const rows = await prisma.priceGroupRule.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const imeiGroupIds = rows.map((r) => r.imeiGroupId).filter(Boolean) as string[];
  const serverBoxIds = rows.map((r) => r.serverBoxId).filter(Boolean) as string[];
  const imeiServiceIds = rows.map((r) => r.imeiServiceId).filter(Boolean) as string[];
  const serverServiceIds = rows.map((r) => r.serverServiceId).filter(Boolean) as string[];

  const [imeiGroups, serverBoxes, imeiServices, serverServices] = await Promise.all([
    imeiGroupIds.length
      ? prisma.imeiServiceGroup.findMany({
          where: { id: { in: imeiGroupIds } },
          select: { id: true, title: true, _count: { select: { services: true } } },
        })
      : [],
    serverBoxIds.length
      ? prisma.serverServiceBox.findMany({
          where: { id: { in: serverBoxIds } },
          select: { id: true, title: true, _count: { select: { services: true } } },
        })
      : [],
    imeiServiceIds.length
      ? prisma.imeiService.findMany({
          where: { id: { in: imeiServiceIds } },
          select: {
            id: true,
            title: true,
            toolId: true,
            price: true,
            groupId: true,
            group: { select: { title: true } },
          },
        })
      : [],
    serverServiceIds.length
      ? prisma.serverService.findMany({
          where: { id: { in: serverServiceIds } },
          select: {
            id: true,
            title: true,
            toolId: true,
            price: true,
            boxId: true,
            box: { select: { title: true } },
          },
        })
      : [],
  ]);

  const imeiGroupMap = new Map(imeiGroups.map((g) => [g.id, g]));
  const serverBoxMap = new Map(serverBoxes.map((b) => [b.id, b]));
  const imeiServiceMap = new Map(imeiServices.map((s) => [s.id, s]));
  const serverServiceMap = new Map(serverServices.map((s) => [s.id, s]));

  return apiSuccess(
    rows.map((r) => {
      const values = ruleValuesFromRow(r);
      const summary = formatPriceRuleSummary(values);
      if (r.scope === 'CATALOG_GROUP') {
        const ig = r.imeiGroupId ? imeiGroupMap.get(r.imeiGroupId) : null;
        const sb = r.serverBoxId ? serverBoxMap.get(r.serverBoxId) : null;
        return {
          id: r.id,
          scope: r.scope,
          kind: r.kind,
          catalogGroupId: r.imeiGroupId ?? r.serverBoxId,
          catalogGroupTitle: ig?.title ?? sb?.title ?? '—',
          serviceCount: ig?._count.services ?? sb?._count.services ?? 0,
          summary,
          ...values,
        };
      }
      const imei = r.imeiServiceId ? imeiServiceMap.get(r.imeiServiceId) : null;
      const server = r.serverServiceId ? serverServiceMap.get(r.serverServiceId) : null;
      return {
        id: r.id,
        scope: r.scope,
        kind: r.kind,
        serviceId: r.imeiServiceId ?? r.serverServiceId,
        serviceTitle: imei?.title ?? server?.title ?? '—',
        serviceRef: imei?.toolId ?? server?.toolId ?? null,
        catalogGroupTitle: imei?.group.title ?? server?.box.title ?? null,
        retailPrice: Number(imei?.price ?? server?.price ?? 0),
        summary,
        ...values,
      };
    }),
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const parsed = priceRuleUpsertSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  const group = await prisma.priceGroup.findUnique({ where: { id } });
  if (!group) return apiError('Group not found', 404);

  const { scope, kind, catalogGroupId, serviceId } = parsed.data;

  if (scope === 'CATALOG_GROUP') {
    if (kind === 'imei') {
      const g = await prisma.imeiServiceGroup.findUnique({ where: { id: catalogGroupId } });
      if (!g) return apiError('IMEI group not found', 404);
    } else {
      const b = await prisma.serverServiceBox.findUnique({ where: { id: catalogGroupId } });
      if (!b) return apiError('Server box not found', 404);
    }
  } else if (kind === 'imei') {
    const svc = await prisma.imeiService.findUnique({ where: { id: serviceId } });
    if (!svc) return apiError('IMEI service not found', 404);
  } else {
    const svc = await prisma.serverService.findUnique({ where: { id: serviceId } });
    if (!svc) return apiError('Server service not found', 404);
  }

  const data = ruleDataFromPayload(parsed.data);

  let created;
  if (scope === 'SERVICE' && kind === 'imei') {
    created = await prisma.priceGroupRule.upsert({
      where: { priceGroupId_imeiServiceId: { priceGroupId: id, imeiServiceId: serviceId! } },
      create: { priceGroupId: id, ...data },
      update: data,
    });
  } else if (scope === 'SERVICE' && kind === 'server') {
    created = await prisma.priceGroupRule.upsert({
      where: { priceGroupId_serverServiceId: { priceGroupId: id, serverServiceId: serviceId! } },
      create: { priceGroupId: id, ...data },
      update: data,
    });
  } else if (scope === 'CATALOG_GROUP' && kind === 'imei') {
    created = await prisma.priceGroupRule.upsert({
      where: { priceGroupId_imeiGroupId: { priceGroupId: id, imeiGroupId: catalogGroupId! } },
      create: { priceGroupId: id, ...data },
      update: data,
    });
  } else {
    created = await prisma.priceGroupRule.upsert({
      where: { priceGroupId_serverBoxId: { priceGroupId: id, serverBoxId: catalogGroupId! } },
      create: { priceGroupId: id, ...data },
      update: data,
    });
  }

  await logActivity({
    userId: session.user.id,
    action: 'price_group.rule_set',
    entity: 'PriceGroupRule',
    entityId: created.id,
    metadata: { priceGroupId: id, scope, kind, ruleType: parsed.data.ruleType },
  });

  return apiSuccess(created, 201);
}
