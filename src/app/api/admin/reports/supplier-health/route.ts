import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { getSupplierHealthPanel } from '@/lib/supplier-sync/health';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? 30)));

  try {
    const providers = await getSupplierHealthPanel(days);
    return apiSuccess({ providers, days });
  } catch (e) {
    console.error('[ADMIN_SUPPLIER_HEALTH]', e);
    return apiError('Failed to load supplier health', 500);
  }
}
