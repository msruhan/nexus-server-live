import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { findDuplicateServices } from '@/lib/supplier-sync/duplicates';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  try {
    const groups = await findDuplicateServices();
    return apiSuccess({ groups, count: groups.length });
  } catch (e) {
    console.error('[ADMIN_DUPLICATES]', e);
    return apiError('Failed to scan duplicates', 500);
  }
}
