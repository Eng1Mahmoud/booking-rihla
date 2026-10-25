'use client';
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import { useActionErrors } from '@/shared/hooks/useActionErrors';
import type { DataTableState } from '@/shared/hooks/useDataTableState';
import { cityOptionsQuery } from '@/features/cities/lib/cityOptions';
import {
  getStationsAction,
  saveStationAction,
  deleteStationAction,
} from '../actions/station.actions';
import type { StationInput } from '../schemas/stationSchema';

export function useStationsData(
  params: DataTableState<{ cityId: string }>['params'],
) {
  const t = useTranslations('Stations');
  const locale = useLocale();
  const client = useQueryClient();
  const options = cityOptionsQuery(locale);
  const query = useQuery({
    queryKey: ['locations', locale, 'stations', params],
    queryFn: async () => {
      const [page, cities] = await Promise.all([
        invokeAction(() =>
          getStationsAction({
            search: params.search,
            limit: params.limit,
            offset: params.offset,
            cityId: params.filters.cityId || undefined,
          }),
        ),
        client.fetchQuery(options),
      ]);
      return { ...page, cities };
    },
  });
  const actionError = useActionErrors(query.error, {
    STATION_HAS_ROUTES: t('stationHasRoutes'),
    STATION_NOT_FOUND: t('stationNotFound'),
    CITY_NOT_FOUND: t('cityNotFound'),
  });
  const save = useMutation({
    retry: false,
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: StationInput;
    }) => {
      try {
        await invokeAction(() => saveStationAction({ ...values, id }));
        await client.invalidateQueries({ queryKey: ['locations'] });
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  const remove = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      try {
        await invokeAction(() => deleteStationAction(id));
        await client.invalidateQueries({ queryKey: ['locations'] });
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  async function refresh() {
    await client.invalidateQueries({
      queryKey: options.queryKey,
      refetchType: 'none',
    });
    return query.refetch();
  }
  const cachedCities =
    query.data?.cities ?? client.getQueryData(options.queryKey);
  const collator = useMemo(() => new Intl.Collator(locale), [locale]);
  const cities = useMemo(
    () =>
      (cachedCities ?? []).toSorted((a, b) =>
        collator.compare(
          a[locale === 'ar' ? 'nameAr' : 'nameEn'],
          b[locale === 'ar' ? 'nameAr' : 'nameEn'],
        ),
      ),
    [cachedCities, collator, locale],
  );
  return { query, save, remove, refresh, cities };
}
