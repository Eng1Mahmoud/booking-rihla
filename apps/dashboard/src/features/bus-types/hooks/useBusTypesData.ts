'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib';
import { useActionErrors } from '@/shared/hooks';
import type { ListQuery } from '@/shared/types';
import {
  getBusTypesAction,
  saveBusTypeAction,
  deleteBusTypeAction,
} from '../actions/busType.actions';
import type { BusTypeInput } from '../schemas/busTypeSchema';

export function useBusTypesData(params: ListQuery) {
  const t = useTranslations('BusTypes');
  const locale = useLocale();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['fleet', locale, 'bus-types', params],
    queryFn: () =>
      invokeAction(() =>
        getBusTypesAction({
          search: params.search,
          limit: params.limit,
          offset: params.offset,
        }),
      ),
  });
  const actionError = useActionErrors(query.error, {
    BUS_TYPE_CODE_EXISTS: t('codeExists'),
    BUS_TYPE_IN_USE: t('inUse'),
    BUS_TYPE_HAS_BOOKINGS: t('hasBookings'),
    BUS_TYPE_NOT_FOUND: t('notFound'),
  });
  const save = useMutation({
    retry: false,
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: BusTypeInput;
    }) => {
      try {
        await invokeAction(() => saveBusTypeAction({ ...values, id }));
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
        await invokeAction(() => deleteBusTypeAction(id));
        await client.invalidateQueries({ queryKey: ['fleet'] });
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  return { query, save, remove, refresh: query.refetch };
}
