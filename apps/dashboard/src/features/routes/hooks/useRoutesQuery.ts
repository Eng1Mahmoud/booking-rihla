'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useTableQuery } from '@/shared/hooks/useTableQuery';
import { invokeAction } from '@/shared/lib/apiResult';
import {
  getRoutesAction,
  getRouteStationsAction,
} from '../actions/route.actions';
export function useRoutesQuery() {
  const locale = useLocale();
  const client = useQueryClient();
  const table = useTableQuery({
    action: getRoutesAction,
    queryKey: 'routes',
    loadRelatedData: async () => ({
      stations: await client.fetchQuery({
        queryKey: ['catalog', locale, 'route-stations'],
        queryFn: () => invokeAction(getRouteStationsAction),
      }),
    }),
  });
  async function refresh() {
    await client.invalidateQueries({
      queryKey: ['catalog', locale, 'route-stations'],
      refetchType: 'none',
    });
    return table.query.refetch();
  }
  return { ...table, stations: table.query.data?.stations ?? [], refresh };
}
