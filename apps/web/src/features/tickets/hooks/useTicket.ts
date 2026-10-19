'use client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/lib/queryClient';
import { ticketsApi } from '../api/tickets.api';
export function useTicket(userId: string | undefined, bookingId: string) {
  return useQuery({
    queryKey: queryKeys.ticket(userId, bookingId),
    enabled: Boolean(userId),
    queryFn: ({ signal }) => ticketsApi.get(bookingId, signal),
    retry: false,
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: 'always',
  });
}
