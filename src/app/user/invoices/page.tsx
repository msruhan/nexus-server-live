import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatUSD, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServerTablePagination } from '@/components/ui/ServerTablePagination';
import { buildTablePageHref, DEFAULT_TABLE_PAGE_SIZE, parseTablePage } from '@/lib/table-pagination';
import { DownloadSimple, Receipt } from '@phosphor-icons/react/dist/ssr';

export const dynamic = 'force-dynamic';

export default async function UserInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const params = await searchParams;
  const { page, pageSize, skip } = parseTablePage(params.page, DEFAULT_TABLE_PAGE_SIZE);

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.invoice.count({ where: { userId } }),
  ]);

  return (
    <div>
      <PageHeader
        section="§ Invoices"
        title={
          <>
            Receipts &amp; <span className="font-serif italic font-normal">invoices</span>.
          </>
        }
        subtitle="Download a PDF receipt for every top-up and purchase, for your records."
      />

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-paper-50 py-16 text-center">
          <Receipt size={32} className="text-ink-soft" weight="duotone" />
          <p className="mt-3 font-serif italic text-ink-muted">
            No invoices yet. They appear automatically after a top-up.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-ink">{inv.number}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {formatDate(inv.issuedAt)}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {inv.description}
                    {inv.orderCode && (
                      <span className="ml-1 font-mono text-[10px] text-ink-soft">({inv.orderCode})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'REFUNDED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{formatUSD(inv.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/api/user/invoices/${inv.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:underline"
                    >
                      <DownloadSimple size={13} weight="bold" /> PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <ServerTablePagination
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          buildHref={(p) => buildTablePageHref('/user/invoices', {}, p)}
        />
      )}
    </div>
  );
}
