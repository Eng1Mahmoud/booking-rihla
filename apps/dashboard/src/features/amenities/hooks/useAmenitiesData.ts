'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import { useActionErrors } from '@/shared/hooks/useActionErrors';
import type { ListQuery } from '@/shared/types/list';
import {
  getAmenitiesAction,
  saveAmenityAction,
  deleteAmenityAction,
} from '../actions/amenity.actions';
import type { AmenityInput } from '../schemas/amenitySchema';

export function useAmenitiesData(params: ListQuery) {
  const t = useTranslations('Amenities');
  const locale = useLocale();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['fleet', locale, 'amenities', params],
    queryFn: () =>
      invokeAction(() =>
        getAmenitiesAction({
          search: params.search,
          limit: params.limit,
          offset: params.offset,
        }),
      ),
  });
  const actionError = useActionErrors(query.error, {
    AMENITY_CODE_EXISTS: t('codeExists'),
    AMENITY_IN_USE: t('inUse'),
    AMENITY_HAS_BOOKINGS: t('hasBookings'),
    AMENITY_NOT_FOUND: t('notFound'),
  });
  const save = useMutation({
    retry: false,
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: AmenityInput;
    }) => {
      try {
        await invokeAction(() => saveAmenityAction({ ...values, id }));
        await client.invalidateQueries({ queryKey: ['fleet'] });
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  const remove = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      try {
        await invokeAction(() => deleteAmenityAction(id));
        await client.invalidateQueries({ queryKey: ['fleet'] });
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  return { query, save, remove, refresh: query.refetch };
}
