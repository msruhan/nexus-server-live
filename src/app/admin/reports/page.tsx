import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/sub-admin';
import { getAnalyticsSummary } from '@/lib/analytics';
import { PageHeader } from '@/components/ui/PageHeader';
import { ReportsView } from './ReportsView';

export const dynamic = 'force-dynamic';

const VALID_PERIODS = ['24h', '7d', '30d', '90d', '1y'];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const role = session.user.role as string;
  if (role !== 'ADMIN' && role !== 'SUB_ADMIN') redirect('/user/dashboard');
  if (role === 'SUB_ADMIN') {
    const allowed = await hasPermission(session.user.id, role, 'viewReports');
    if (!allowed) redirect('/admin/no-access');
  }

  const sp = await searchParams;
  const period = VALID_PERIODS.includes(sp.period ?? '') ? sp.period! : '30d';
  const data = await getAnalyticsSummary(period);

  return (
    <div>
      <PageHeader
        section="§ Admin · reports"
        title={
          <>
            Analytics &amp; <span className="font-serif italic font-normal">reports</span>.
          </>
        }
        subtitle="Revenue, success rates, best-selling services, and top customers. Export to CSV."
      />
      <ReportsView data={data} period={period} />
    </div>
  );
}
