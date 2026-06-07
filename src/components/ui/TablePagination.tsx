'use client';

import * as React from 'react';

type TablePaginationProps = {
  currentPage: number;
  pageCount: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function TablePagination({
  currentPage,
  pageCount,
  totalItems,
  onPageChange,
  className = '',
}: TablePaginationProps) {
  if (pageCount <= 1 && totalItems == null) return null;

  return (
    <div className={`mt-3 flex items-center justify-between gap-3 ${className}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        {totalItems != null ? `${totalItems} total · ` : ''}
        Page {currentPage} / {pageCount}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-bold text-ink hover:border-ink disabled:opacity-50"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          className="rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-bold text-ink hover:border-ink disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function useTablePagination<T>(
  items: T[],
  resetDeps: React.DependencyList = [],
  pageSize = 25,
) {
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const { pageRows, currentPage, pageCount } = React.useMemo(() => {
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const currentPage = Math.min(Math.max(1, page), pageCount);
    const start = (currentPage - 1) * pageSize;
    return {
      pageRows: items.slice(start, start + pageSize),
      currentPage,
      pageCount,
    };
  }, [items, page, pageSize]);

  return { pageRows, currentPage, pageCount, setPage };
}
