'use client';
import { ticketKeys } from './queryKeys';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { invokeAction } from '@/shared/lib/apiResult';
import { getTicketAction } from '../actions/tickets.actions';
import type { TicketViewData } from '../types/ticket';
export function useTicket(initial: TicketViewData, userId: string) {
  const locale = useLocale();
  const { user } = useAuth();
  return useQuery({
    queryKey: ticketKeys.detail(userId, locale, initial.bookingId),
    queryFn: () => invokeAction(() => getTicketAction(initial.bookingId)),
    initialData: initial,
    enabled: user?.id === userId,
    staleTime: 0,
  });
}
