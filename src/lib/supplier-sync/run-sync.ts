import { prisma } from '@/lib/db';
import type { ImeiApi } from '@prisma/client';
import { applySupplierCatalog } from './apply-catalog';
import {
  fetchImeiSupplierCatalog,
  fetchServerSupplierCatalog,
  fetchSupplierBalance,
} from './fetch-catalog';
import type { SyncChangeEntry } from './types';

export type RunSupplierSyncResult = {
  ok: boolean;
  logId: string;
  summary: string;
  changes: SyncChangeEntry[];
  pendingReconnect: boolean;
  error?: string;
};

export async function runSupplierSync(
  apiId: string,
  trigger: 'manual' | 'scheduled' | 'cron' = 'manual',
): Promise<RunSupplierSyncResult> {
  const api = await prisma.imeiApi.findUnique({ where: { id: apiId } });
  if (!api) {
    return { ok: false, logId: '', summary: '', changes: [], pendingReconnect: false, error: 'Provider not found' };
  }
  if (api.status !== 'ACTIVE') {
    return { ok: false, logId: '', summary: '', changes: [], pendingReconnect: false, error: 'Provider is inactive' };
  }

  const log = await prisma.supplierSyncLog.create({
    data: {
      apiId,
      trigger,
      kind: 'catalog',
      status: 'running',
      startedAt: new Date(),
    },
  });

  try {
    const balance = await fetchSupplierBalance(api);
    if (balance != null) {
      await prisma.imeiApi.update({
        where: { id: apiId },
        data: { cachedBalance: balance, cachedBalanceAt: new Date() },
      });
    }

    let imeiCatalog: Awaited<ReturnType<typeof fetchImeiSupplierCatalog>>['rows'] = [];
    let serverCatalog: Awaited<ReturnType<typeof fetchServerSupplierCatalog>>['rows'] = [];

    if (api.syncImeiServices) {
      const res = await fetchImeiSupplierCatalog(api);
      imeiCatalog = res.rows;
    }
    if (api.syncServerServices) {
      const res = await fetchServerSupplierCatalog(api);
      serverCatalog = res.rows;
    }

    const applied = await applySupplierCatalog(api, imeiCatalog, serverCatalog);
    const summary = buildSummary(applied.allChanges, applied.imei, applied.server);

    await prisma.imeiApi.update({
      where: { id: apiId },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: null,
        syncRequiresReconnect: applied.pendingReconnect ? true : api.syncRequiresReconnect,
      },
    });

    await prisma.supplierSyncLog.update({
      where: { id: log.id },
      data: {
        status: 'success',
        summary,
        changes: JSON.stringify(applied.allChanges),
        completedAt: new Date(),
      },
    });

    return {
      ok: true,
      logId: log.id,
      summary,
      changes: applied.allChanges,
      pendingReconnect: applied.pendingReconnect,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed';
    await prisma.imeiApi.update({
      where: { id: apiId },
      data: { lastSyncError: message },
    });
    await prisma.supplierSyncLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        error: message,
        completedAt: new Date(),
      },
    });
    return {
      ok: false,
      logId: log.id,
      summary: '',
      changes: [],
      pendingReconnect: false,
      error: message,
    };
  }
}

function buildSummary(
  changes: SyncChangeEntry[],
  imei: { checked: number; updated: number; disabled: number },
  server: { checked: number; updated: number; disabled: number },
): string {
  const parts: string[] = [];
  parts.push(`IMEI: ${imei.updated} updated, ${imei.disabled} disabled (${imei.checked} linked)`);
  parts.push(`Server: ${server.updated} updated, ${server.disabled} disabled (${server.checked} linked)`);
  const priceChanges = changes.filter((c) => c.action === 'price_auto_adjusted').length;
  const pending = changes.filter((c) => c.action === 'price_change_pending').length;
  const titles = changes.filter((c) => c.action === 'title_updated').length;
  if (priceChanges) parts.push(`${priceChanges} auto price adjustment(s)`);
  if (pending) parts.push(`${pending} price change(s) pending reconnect`);
  if (titles) parts.push(`${titles} title update(s)`);
  return parts.join(' · ');
}

export async function acknowledgeSupplierReconnect(apiId: string): Promise<ImeiApi> {
  return prisma.imeiApi.update({
    where: { id: apiId },
    data: { syncRequiresReconnect: false },
  });
}
