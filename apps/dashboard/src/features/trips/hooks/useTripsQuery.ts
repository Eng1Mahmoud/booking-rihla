'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useTableQuery } from '@/shared/hooks/useTableQuery';
import { invokeAction } from '@/shared/lib/apiResult';
import { getTripsAction, getTripOptionsAction } from '../actions/trip.actions';
import type { TripOptions } from '../types/trip';
const emptyOptions: TripOptions = { routes: [], stations: [], buses: [] };
export function useTripsQuery() {
  const locale = useLocale();
  const client = useQueryClient();
  const table = useTableQuery({
    action: getTripsAction,
    queryKey: 'trips',
    loadRelatedData: async () => ({
      options: await client.fetchQuery({
        queryKey: ['catalog', locale, 'trip-options'],
        queryFn: () => invokeAction(getTripOptionsAction),
      }),
    }),
  });
  async function refresh() {
    await client.invalidateQueries({
      queryKey: ['catalog', locale, 'trip-options'],
      refetchType: 'none',
    });
    return table.query.refetch();
  }
  return {
    ...table,
    options: table.query.data?.options ?? emptyOptions,
    refresh,
  };
}
