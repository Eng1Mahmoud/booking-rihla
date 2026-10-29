'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import { useActionErrors } from '@/shared/hooks/useActionErrors';
import type { ListQuery } from '@/shared/types/list';
import {
  getCitiesAction,
  saveCityAction,
  deleteCityAction,
} from '../actions/city.actions';
import type { CityInput } from '../schemas/citySchema';

export function useCitiesData(params: ListQuery) {
  const t = useTranslations('Cities');
  const locale = useLocale();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['locations', locale, 'cities', params],
    queryFn: () =>
      invokeAction(() =>
        getCitiesAction({
          search: params.search,
          limit: params.limit,
          offset: params.offset,
        }),
      ),
  });
  const actionError = useActionErrors(query.error, {
    CITY_HAS_STATIONS: t('cityHasStations'),
    CITY_NOT_FOUND: t('cityNotFound'),
  });
  const save = useMutation({
    retry: false,
    mutationFn: async ({ id, values }: { id?: string; values: CityInput }) => {
      try {
        await invokeAction(() => saveCityAction({ ...values, id }));
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
        await invokeAction(() => deleteCityAction(id));
        await client.invalidateQueries({ queryKey: ['locations'] });
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  return { query, save, remove, refresh: query.refetch };
}
