export const DEFAULT_TABLE_PAGE_SIZE = 25;
/** User-facing order history tables — smaller pages so pagination is visible sooner. */
export const USER_ORDERS_PAGE_SIZE = 10;

export function parseTablePage(
  rawPage: string | undefined,
  pageSize = DEFAULT_TABLE_PAGE_SIZE,
): { page: number; pageSize: number; skip: number } {
  const parsed = Number.parseInt(rawPage ?? '1', 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function tablePageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize = DEFAULT_TABLE_PAGE_SIZE,
): { pageRows: T[]; currentPage: number; pageCount: number } {
  const pageCount = tablePageCount(items.length, pageSize);
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * pageSize;
  return {
    pageRows: items.slice(start, start + pageSize),
    currentPage,
    pageCount,
  };
}

export function buildTablePageHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
  pageParam = 'page',
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  if (page > 1) sp.set(pageParam, String(page));
  const query = sp.toString();
  return query ? `${basePath}?${query}` : basePath;
}
