'use client';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import { useActionErrors } from '@/shared/hooks/useActionErrors';
import {
  getTripOptionsAction,
  previewTripBatchAction,
  createTripBatchAction,
} from '../actions/trip.actions';
import type { BatchInput, BatchPreview } from '../schemas/tripSchema';
export function useTripBatch() {
  const locale = useLocale(),
    t = useTranslations('Trips'),
    client = useQueryClient();
  const options = useQuery({
    queryKey: ['catalog', locale, 'trip-options'],
    queryFn: () => invokeAction(getTripOptionsAction),
  });
  const [review, setReview] = useState<{
      input: BatchInput;
      preview: BatchPreview;
    } | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const actionError = useActionErrors(options.error, {
    BUS_SCHEDULE_CONFLICT: t('conflict'),
    INVALID_DEPARTURE_TIME: t('invalidTime'),
    NO_DEPARTURES: t('noDepartures'),
    BUS_INACTIVE: t('inactive'),
    ROUTE_INACTIVE: t('inactive'),
  });
  const preview = useMutation({
    retry: false,
    mutationFn: async (input: BatchInput) => {
      setReview(null);
      setNotice('');
      setError('');
      try {
        const result = await invokeAction(() => previewTripBatchAction(input));
        setReview({
          input: { ...input, weekdays: [...input.weekdays] },
          preview: result,
        });
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  const create = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!review?.preview.canCreate) return;
      const input = review.input;
      setError('');
      try {
        const result = await invokeAction(() => createTripBatchAction(input));
        setReview(null);
        setNotice(t('batchCreated', { count: result.totalTrips }));
        await client.invalidateQueries({ queryKey: ['trips'] });
      } catch (error) {
        setReview(null);
        setError(actionError(error).message);
      }
    },
  });
  return {
    t,
    options,
    review,
    error,
    notice,
    preview,
    create,
    pending: preview.isPending || create.isPending,
    clearReview: () => {
      if (!preview.isPending && !create.isPending) {
        setReview(null);
        setNotice('');
        setError('');
      }
    },
  };
}
