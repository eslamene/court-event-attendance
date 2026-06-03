export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(
        searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
        10
      ) || DEFAULT_PAGE_SIZE
    )
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

export function parseSort(
  searchParams: URLSearchParams,
  allowed: readonly string[],
  defaultSort: string
) {
  const raw = searchParams.get("sort") || defaultSort;
  const sort = allowed.includes(raw) ? raw : defaultSort;
  const order =
    searchParams.get("order") === "asc" ? ("asc" as const) : ("desc" as const);
  return { sort, order };
}

export function parseColumnFilters(
  searchParams: URLSearchParams,
  keys: readonly string[]
): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const key of keys) {
    const value = searchParams.get(key)?.trim();
    if (value) filters[key] = value;
  }
  return filters;
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items, total, page, pageSize, totalPages };
}
