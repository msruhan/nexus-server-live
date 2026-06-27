import { prisma } from '@/lib/db';
import type { ImeiApi, SupplierPriceChangePolicy } from '@prisma/client';
import { roundMoney, toNum } from './money';
import type { ApplyCatalogResult, SupplierCatalogRow, SyncChangeEntry } from './types';

type ServiceKind = 'imei' | 'server';

function resolveMargin(
  serviceFixedMargin: number | null | undefined,
  apiDefaultMargin: number | null | undefined,
  currentRetail: number,
  newSupplierPrice: number,
): number {
  if (serviceFixedMargin != null && serviceFixedMargin > 0) return serviceFixedMargin;
  if (apiDefaultMargin != null && apiDefaultMargin > 0) return apiDefaultMargin;
  return Math.max(0, roundMoney(currentRetail - newSupplierPrice));
}

function priceChanged(oldVal: number | null | undefined, newVal: number): boolean {
  if (oldVal == null) return newVal > 0;
  return Math.abs(toNum(oldVal) - newVal) >= 0.01;
}

async function loadRejectRates(
  kind: ServiceKind,
  serviceIds: string[],
  days = 30,
): Promise<Map<string, number>> {
  if (serviceIds.length === 0) return new Map();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const map = new Map<string, { total: number; rejected: number }>();

  if (kind === 'imei') {
    const orders = await prisma.imeiOrder.findMany({
      where: {
        serviceId: { in: serviceIds },
        createdAt: { gte: since },
        status: { in: ['SUCCESS', 'REJECTED'] },
      },
      select: { serviceId: true, status: true },
    });
    for (const o of orders) {
      const cur = map.get(o.serviceId) ?? { total: 0, rejected: 0 };
      cur.total += 1;
      if (o.status === 'REJECTED') cur.rejected += 1;
      map.set(o.serviceId, cur);
    }
  } else {
    const orders = await prisma.serverOrder.findMany({
      where: {
        serviceId: { in: serviceIds },
        createdAt: { gte: since },
        status: { in: ['SUCCESS', 'REJECTED'] },
      },
      select: { serviceId: true, status: true },
    });
    for (const o of orders) {
      const cur = map.get(o.serviceId) ?? { total: 0, rejected: 0 };
      cur.total += 1;
      if (o.status === 'REJECTED') cur.rejected += 1;
      map.set(o.serviceId, cur);
    }
  }

  const rates = new Map<string, number>();
  for (const [id, v] of map) {
    rates.set(id, v.total === 0 ? 0 : (v.rejected / v.total) * 100);
  }
  return rates;
}

async function applyForKind(
  api: ImeiApi,
  kind: ServiceKind,
  catalog: SupplierCatalogRow[],
): Promise<ApplyCatalogResult> {
  const changes: SyncChangeEntry[] = [];
  let updated = 0;
  let disabled = 0;
  let pendingReconnect = false;
  const policy = api.priceChangePolicy as SupplierPriceChangePolicy;
  const rejectThreshold = api.rejectRateThreshold ? toNum(api.rejectRateThreshold) : null;

  const catalogByToolId = new Map(catalog.map((r) => [r.toolId, r]));

  const existing =
    kind === 'imei'
      ? await prisma.imeiService.findMany({ where: { apiId: api.id } })
      : await prisma.serverService.findMany({ where: { apiId: api.id } });

  const rejectRates =
    api.autoDisableHighReject && rejectThreshold != null
      ? await loadRejectRates(
          kind,
          existing.map((s) => s.id),
        )
      : new Map<string, number>();

  for (const svc of existing) {
    if (!svc.toolId) continue;
    const row = catalogByToolId.get(svc.toolId);

    if (!row) {
      if (api.autoDisableRemoved && svc.status === 'ACTIVE') {
        if (kind === 'imei') {
          await prisma.imeiService.update({
            where: { id: svc.id },
            data: {
              status: 'INACTIVE',
              supplierMissingSince: svc.supplierMissingSince ?? new Date(),
            },
          });
        } else {
          await prisma.serverService.update({
            where: { id: svc.id },
            data: {
              status: 'INACTIVE',
              supplierMissingSince: svc.supplierMissingSince ?? new Date(),
            },
          });
        }
        disabled += 1;
        changes.push({
          kind,
          serviceId: svc.id,
          toolId: svc.toolId,
          title: svc.title,
          action: 'disabled_missing',
        });
      }
      continue;
    }

    const oldSupplier = svc.supplierPrice != null ? toNum(svc.supplierPrice) : null;
    const oldRetail = toNum(svc.price);
    const newSupplier = roundMoney(row.price);
    const dataPatch: Record<string, unknown> = {
      supplierMissingSince: null,
    };
    let localUpdated = false;

    if (row.title && row.title !== svc.title) {
      dataPatch.title = row.title;
      changes.push({
        kind,
        serviceId: svc.id,
        toolId: svc.toolId,
        title: svc.title,
        action: 'title_updated',
        oldTitle: svc.title,
        newTitle: row.title,
      });
      localUpdated = true;
    }

    if (priceChanged(oldSupplier, newSupplier)) {
      dataPatch.supplierPrice = newSupplier;

      if (policy === 'REQUIRE_RECONNECT') {
        pendingReconnect = true;
        changes.push({
          kind,
          serviceId: svc.id,
          toolId: svc.toolId,
          title: svc.title,
          action: 'price_change_pending',
          oldSupplierPrice: oldSupplier ?? undefined,
          newSupplierPrice: newSupplier,
          oldRetailPrice: oldRetail,
        });
      } else {
        const margin = resolveMargin(
          svc.fixedMargin != null ? toNum(svc.fixedMargin) : null,
          api.defaultFixedMargin != null ? toNum(api.defaultFixedMargin) : null,
          oldRetail,
          newSupplier,
        );
        const newRetail = roundMoney(newSupplier + margin);
        dataPatch.fixedMargin = margin;
        dataPatch.price = newRetail;
        changes.push({
          kind,
          serviceId: svc.id,
          toolId: svc.toolId,
          title: svc.title,
          action: 'price_auto_adjusted',
          oldSupplierPrice: oldSupplier ?? undefined,
          newSupplierPrice: newSupplier,
          oldRetailPrice: oldRetail,
          newRetailPrice: newRetail,
        });
        localUpdated = true;
      }
    } else if (oldSupplier == null) {
      dataPatch.supplierPrice = newSupplier;
      const margin = resolveMargin(
        svc.fixedMargin != null ? toNum(svc.fixedMargin) : null,
        api.defaultFixedMargin != null ? toNum(api.defaultFixedMargin) : null,
        oldRetail,
        newSupplier,
      );
      if (svc.fixedMargin == null && margin > 0) dataPatch.fixedMargin = margin;
      localUpdated = true;
    }

    if (api.autoDisableHighReject && rejectThreshold != null) {
      const rate = rejectRates.get(svc.id) ?? 0;
      if (rate >= rejectThreshold && svc.status === 'ACTIVE') {
        dataPatch.status = 'INACTIVE';
        disabled += 1;
        changes.push({
          kind,
          serviceId: svc.id,
          toolId: svc.toolId,
          title: svc.title,
          action: 'disabled_high_reject',
        });
        localUpdated = true;
      }
    }

    if (localUpdated || Object.keys(dataPatch).length > 1) {
      if (kind === 'imei') {
        await prisma.imeiService.update({ where: { id: svc.id }, data: dataPatch });
      } else {
        await prisma.serverService.update({ where: { id: svc.id }, data: dataPatch });
      }
      updated += 1;
    }
  }

  return {
    checked: existing.length,
    updated,
    disabled,
    pendingReconnect,
    changes,
  };
}

export async function applySupplierCatalog(
  api: ImeiApi,
  imeiCatalog: SupplierCatalogRow[],
  serverCatalog: SupplierCatalogRow[],
): Promise<{
  imei: ApplyCatalogResult;
  server: ApplyCatalogResult;
  pendingReconnect: boolean;
  allChanges: SyncChangeEntry[];
}> {
  const imei = await applyForKind(api, 'imei', imeiCatalog);
  const server = await applyForKind(api, 'server', serverCatalog);
  const pendingReconnect = imei.pendingReconnect || server.pendingReconnect;
  return {
    imei,
    server,
    pendingReconnect,
    allChanges: [...imei.changes, ...server.changes],
  };
}

export function computeImportPricing(
  supplierPrice: number,
  retailPrice: number,
  defaultFixedMargin?: number | null,
): { supplierPrice: number; fixedMargin: number; price: number } {
  const supplier = roundMoney(supplierPrice);
  const retail = roundMoney(retailPrice);
  const margin =
    defaultFixedMargin != null && defaultFixedMargin > 0
      ? roundMoney(defaultFixedMargin)
      : Math.max(0, roundMoney(retail - supplier));
  return { supplierPrice: supplier, fixedMargin: margin, price: retail };
}
