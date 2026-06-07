import Link from 'next/link';
import { tablePageCount } from '@/lib/table-pagination';

type ServerTablePaginationProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  buildHref: (page: number) => string;
  className?: string;
};

export function ServerTablePagination({
  currentPage,
  totalItems,
  pageSize,
  buildHref,
  className = '',
}: ServerTablePaginationProps) {
  if (totalItems <= 0) return null;

  const pageCount = tablePageCount(totalItems, pageSize);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= pageCount;
  const btnClass =
    'rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-bold text-ink hover:border-ink disabled:opacity-50';

  return (
    <div className={`mt-3 flex items-center justify-between gap-3 ${className}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        {totalItems} total · Page {currentPage} / {pageCount}
      </div>
      <div className="flex items-center gap-2">
        {prevDisabled ? (
          <span className={`${btnClass} pointer-events-none opacity-50`}>Prev</span>
        ) : (
          <Link href={buildHref(currentPage - 1)} className={btnClass}>
            Prev
          </Link>
        )}
        {nextDisabled ? (
          <span className={`${btnClass} pointer-events-none opacity-50`}>Next</span>
        ) : (
          <Link href={buildHref(currentPage + 1)} className={btnClass}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
