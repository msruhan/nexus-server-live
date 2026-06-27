import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { listCatalogPickServices } from '@/lib/catalog-services';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const services = await listCatalogPickServices();
    return NextResponse.json({ ok: true, services });
  } catch (e) {
    console.error('[ADMIN_CATALOG_SERVICES_GET]', e);
    return NextResponse.json({ ok: false, error: 'Failed to load services' }, { status: 500 });
  }
}
