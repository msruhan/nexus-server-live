import { prisma } from '@/lib/db';
import { ALL_EMAIL_EVENTS } from '@/lib/email/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServerTablePagination } from '@/components/ui/ServerTablePagination';
import { buildTablePageHref, DEFAULT_TABLE_PAGE_SIZE, parseTablePage } from '@/lib/table-pagination';
import { EmailSettingsForm } from './EmailSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const { page, pageSize, skip } = parseTablePage(params.page, DEFAULT_TABLE_PAGE_SIZE);

  const [settings, recentLogs, totalLogs] = await Promise.all([
    prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        smtpEnabled: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        smtpUsername: true,
        smtpFromAddress: true,
        smtpFromName: true,
        smtpEvents: true,
      },
    }),
    prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        toAddress: true,
        subject: true,
        event: true,
        status: true,
        attempts: true,
        lastError: true,
        sentAt: true,
        createdAt: true,
      },
    }),
    prisma.emailLog.count(),
  ]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        section="§ Admin · email"
        title={
          <>
            SMTP <span className="font-serif italic font-normal">notifications</span>.
          </>
        }
        subtitle="Configure outbound email for ticket replies, order updates, top-ups, and payments."
      />
      <EmailSettingsForm
        initial={{
          smtpEnabled: settings?.smtpEnabled ?? false,
          smtpHost: settings?.smtpHost ?? '',
          smtpPort: settings?.smtpPort ?? 587,
          smtpSecure: settings?.smtpSecure ?? false,
          smtpUsername: settings?.smtpUsername ?? '',
          smtpFromAddress: settings?.smtpFromAddress ?? '',
          smtpFromName: settings?.smtpFromName ?? '',
          smtpEvents: (settings?.smtpEvents ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }}
        availableEvents={ALL_EMAIL_EVENTS}
      />

      <h2 className="mt-12 font-display text-xl font-extrabold tracking-tight">Recent emails</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">To</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-ink-muted">
                  No emails sent yet.
                </td>
              </tr>
            ) : (
              recentLogs.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-mono text-[11px] text-ink-muted">
                    {l.createdAt.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs">{l.toAddress}</td>
                  <td className="px-3 py-2">{l.subject}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{l.event}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        l.status === 'SENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : l.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-zinc-200 text-zinc-700'
                      }`}
                      title={l.lastError ?? ''}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ServerTablePagination
        currentPage={page}
        totalItems={totalLogs}
        pageSize={pageSize}
        buildHref={(p) => buildTablePageHref('/admin/email', {}, p)}
      />
    </div>
  );
}
