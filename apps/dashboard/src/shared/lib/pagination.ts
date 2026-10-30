// Shared default for dashboard tables; the URL limit can override it.
export const DEFAULT_TABLE_PAGE_SIZE = 15;

export function getTablePagination(params: Pick<URLSearchParams, 'get'>) {
  const limit = Number(params.get('limit') ?? DEFAULT_TABLE_PAGE_SIZE);
  const offset = Number(params.get('offset') ?? 0);
  const pageSize =
    Number.isInteger(limit) && limit >= 1 && limit <= 100
      ? limit
      : DEFAULT_TABLE_PAGE_SIZE;
  const pageIndex =
    Number.isInteger(offset) && offset >= 0 && offset <= 100000
      ? Math.floor(offset / pageSize)
      : 0;
  return { pageSize, pageIndex };
}
