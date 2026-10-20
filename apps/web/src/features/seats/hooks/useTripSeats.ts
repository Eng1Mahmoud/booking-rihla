'use client';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import { getTripSeatsAction } from '../actions/seats.actions';
import type { SeatList } from '@/features/trips/types/trip';
export function useTripSeats(initial: SeatList) {
  const locale = useLocale();
  return useQuery({
    queryKey: ['seats', locale, initial.tripId],
    queryFn: () => invokeAction(() => getTripSeatsAction(initial.tripId)),
    initialData: initial,
    staleTime: 0,
    retry: false,
    // Background seat reads go through the same Action/client as manual refresh.
    refetchInterval: 15000,
  });
}
