'use client';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { invokeAction, type ApiResult } from '@/shared/lib/apiResult';
import { getTablePagination } from '@/shared/lib/pagination';

export function useTableQuery<
  Data extends object,
  Related extends object = Record<never, never>,
>({
  action,
  queryKey,
  loadRelatedData,
}: {
  action: (query: string) => Promise<ApiResult<Data>>;
  queryKey: string | readonly string[];
  loadRelatedData?: () => Promise<Related>;
}) {
  const locale = useLocale();
  const urlParams = useSearchParams();
  const { pageSize, pageIndex } = getTablePagination(urlParams);
  const filters: Record<string, string> = {};
  // Only filter.* belongs to the API; page controls such as bookingId stay in the URL.
  for (const name of new Set(urlParams.keys())) {
    if (!name.startsWith('filter.')) continue;
    const field = name.slice('filter.'.length);
    const value = urlParams.get(name);
    if (field && value && !['limit', 'offset', 'locale'].includes(field))
      filters[field] = value;
  }
  const requestParams = new URLSearchParams(filters);
  requestParams.set('locale', locale);
  requestParams.set('limit', String(pageSize));
  requestParams.set('offset', String(pageIndex * pageSize));
  requestParams.sort();
  const requestQuery = requestParams.toString();
  const keys = typeof queryKey === 'string' ? [queryKey] : queryKey;
  const query = useQuery({
    queryKey: [keys[0], locale, ...keys.slice(1), requestQuery],
    queryFn: async () => {
      const [data, relatedData] = await Promise.all([
        invokeAction(() => action(requestQuery)),
        loadRelatedData?.(),
      ]);
      return { ...data, ...relatedData } as Data & Related;
    },
  });
  return {
    query,
    filters,
    hasActiveFilters: Object.values(filters).some((value) => value.trim()),
  };
}
