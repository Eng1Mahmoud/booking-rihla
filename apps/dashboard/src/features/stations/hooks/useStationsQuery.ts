'use client';
import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { useTableQuery } from '@/shared/hooks/useTableQuery';
import { invokeAction } from '@/shared/lib/apiResult';
import { getCityOptionsAction } from '@/features/cities/actions/city.actions';
import { getStationsAction } from '../actions/station.actions';
export function useStationsQuery() {
  const locale = useLocale();
  const client = useQueryClient();
  const cityOptions = queryOptions({
    queryKey: ['locations', locale, 'city-options'],
    queryFn: () => invokeAction(getCityOptionsAction),
  });
  const table = useTableQuery({
    action: getStationsAction,
    queryKey: ['locations', 'stations'],
    loadRelatedData: async () => ({
      cities: await client.fetchQuery(cityOptions),
    }),
  });
  const cachedCities =
    table.query.data?.cities ?? client.getQueryData(cityOptions.queryKey);
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
  async function refresh() {
    await client.invalidateQueries({
      queryKey: cityOptions.queryKey,
      refetchType: 'none',
    });
    return table.query.refetch();
  }
  return { ...table, cities, refresh };
}
