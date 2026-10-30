'use client';
import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useTableQuery } from '@/shared/hooks/useTableQuery';
import { invokeAction } from '@/shared/lib/apiResult';
import { getBusesAction, getBusOptionsAction } from '../actions/bus.actions';
export function useBusesQuery() {
  const locale = useLocale();
  const client = useQueryClient();
  const busOptions = queryOptions({
    queryKey: ['fleet', locale, 'bus-options'],
    queryFn: () => invokeAction(getBusOptionsAction),
    staleTime: 30000,
  });
  const table = useTableQuery({
    action: getBusesAction,
    queryKey: ['fleet', 'buses'],
    loadRelatedData: async () => ({
      options: await client.fetchQuery(busOptions),
    }),
  });
  async function refresh() {
    await client.invalidateQueries({
      queryKey: busOptions.queryKey,
      refetchType: 'none',
    });
    return table.query.refetch();
  }
  return { ...table, refresh };
}
