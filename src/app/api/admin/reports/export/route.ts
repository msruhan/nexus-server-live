/**
 * GET /api/admin/reports/export?period=30d&type=services|providers|customers|daily
 *
 * Exports an analytics dataset as CSV. Read-only; gated to ADMIN or
 * SUB_ADMIN with viewReports permission.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/sub-admin';
import { getAnalyticsSummary } from '@/lib/analytics';

async function requireAccess() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role ?? 'USER';
  if (role !== 'ADMIN' && role !== 'SUB_ADMIN') return null;
  if (role === 'SUB_ADMIN') {
    const allowed = await hasPermission(session.user.id, role, 'viewReports');
    if (!allowed) return null;
  }
  return session;
}

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  return lines.join('\n');
}

export async function GET(req: Request) {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? '30d';
  const type = searchParams.get('type') ?? 'services';

  const data = await getAnalyticsSummary(period);

  let csv = '';
  let filename = `report-${type}-${period}.csv`;

  switch (type) {
    case 'daily':
      csv = toCsv(
        ['Date', 'IMEI Revenue', 'Server Revenue', 'Total'],
        data.revenueByDay.map((d) => [d.date, d.imei, d.server, Math.round((d.imei + d.server) * 100) / 100]),
      );
      break;
    case 'providers':
      csv = toCsv(
        ['Provider', 'Total Orders', 'Successful', 'Success Rate %'],
        data.providerPerformance.map((p) => [p.title, p.total, p.success, p.successRate]),
      );
      break;
    case 'customers':
      csv = toCsv(
        ['Name', 'Email', 'Orders', 'Spend (USD)'],
        data.topCustomers.map((c) => [c.name, c.email, c.orders, c.spend]),
      );
      break;
    case 'services':
    default:
      filename = `report-services-${period}.csv`;
      csv = toCsv(
        ['Service', 'Kind', 'Orders', 'Revenue (USD)'],
        data.topServices.map((s) => [s.title, s.kind, s.orders, s.revenue]),
      );
      break;
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
