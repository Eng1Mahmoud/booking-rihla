'use client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/lib/queryClient';
import { tripsApi } from '../api/trips.api';
import type { SeatList } from '../types/trip';
export function useTripSeats(tripId: string, initialSeats: SeatList) {
  return useQuery({
    queryKey: queryKeys.seats(tripId),
    initialData: initialSeats,
    queryFn: ({ signal }) => tripsApi.seats(tripId, signal),
    refetchInterval: 15000,
    retry: 1,
  });
}
