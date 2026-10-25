'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import { useActionErrors } from '@/shared/hooks/useActionErrors';
import type { BusListQuery } from '../schemas/busSchema';
import { busOptionsQuery } from '../lib/busOptions';
import {
  getBusesAction,
  saveBusAction,
  deleteBusAction,
} from '../actions/bus.actions';
import type { BusInput } from '../schemas/busSchema';

export function useBusesData(params: BusListQuery) {
  const t = useTranslations('Buses');
  const locale = useLocale();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['fleet', locale, 'buses', params],
    queryFn: async () => {
      const [page, options] = await Promise.all([
        invokeAction(() =>
          getBusesAction({
            search: params.search,
            limit: params.limit,
            offset: params.offset,
            busTypeId: params.busTypeId,
            isActive: params.isActive,
          }),
        ),
        client.fetchQuery(busOptionsQuery(locale)),
      ]);
      return { ...page, options };
    },
  });
  const actionError = useActionErrors(query.error, {
    PLATE_NUMBER_EXISTS: t('plateExists'),
    BUS_HAS_BOOKINGS: t('hasBookings'),
    BUS_HAS_TRIPS: t('hasTrips'),
    BUS_IN_USE: t('inUse'),
    BUS_NOT_FOUND: t('notFound'),
    BUS_TYPE_NOT_FOUND: t('missingMetadata'),
    AMENITY_NOT_FOUND: t('missingMetadata'),
  });
  const save = useMutation({
    retry: false,
    mutationFn: async ({ id, values }: { id?: string; values: BusInput }) => {
      try {
        await invokeAction(() => saveBusAction({ ...values, id }));
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
        await invokeAction(() => deleteBusAction(id));
        await client.invalidateQueries({ queryKey: ['fleet'] });
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  async function refresh() {
    await client.invalidateQueries({
      queryKey: busOptionsQuery(locale).queryKey,
      refetchType: 'none',
    });
    return query.refetch();
  }
  return { query, save, remove, refresh };
}
