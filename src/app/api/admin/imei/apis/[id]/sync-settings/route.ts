import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { z } from 'zod';
import { runSupplierSync, acknowledgeSupplierReconnect } from '@/lib/supplier-sync/run-sync';

export const dynamic = 'force-dynamic';

const settingsSchema = z.object({
  syncScheduleEnabled: z.boolean().optional(),
  syncIntervalHours: z.number().int().min(1).max(168).optional(),
  syncImeiServices: z.boolean().optional(),
  syncServerServices: z.boolean().optional(),
  priceChangePolicy: z.enum(['AUTO_FIXED_MARGIN', 'REQUIRE_RECONNECT']).optional(),
  defaultFixedMargin: z.number().min(0).nullable().optional(),
  autoDisableRemoved: z.boolean().optional(),
  autoDisableHighReject: z.boolean().optional(),
  rejectRateThreshold: z.number().min(0).max(100).nullable().optional(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await context.params;
  const api = await prisma.imeiApi.findUnique({
    where: { id },
    select: {
      syncScheduleEnabled: true,
      syncIntervalHours: true,
      syncImeiServices: true,
      syncServerServices: true,
      priceChangePolicy: true,
      defaultFixedMargin: true,
      autoDisableRemoved: true,
      autoDisableHighReject: true,
      rejectRateThreshold: true,
      lastSyncAt: true,
      lastSyncError: true,
      syncRequiresReconnect: true,
      cachedBalance: true,
      cachedBalanceAt: true,
    },
  });
  if (!api) return apiError('Provider not found', 404);
  return apiSuccess(api);
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await context.params;
  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const existing = await prisma.imeiApi.findUnique({ where: { id } });
  if (!existing) return apiError('Provider not found', 404);

  const updated = await prisma.imeiApi.update({
    where: { id },
    data: parsed.data,
  });
  return apiSuccess(updated);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await context.params;
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'acknowledge-reconnect') {
    const api = await acknowledgeSupplierReconnect(id);
    return apiSuccess({ syncRequiresReconnect: api.syncRequiresReconnect });
  }

  const result = await runSupplierSync(id, 'manual');
  if (!result.ok) return apiError(result.error ?? 'Sync failed', 500);
  return apiSuccess(result);
}
