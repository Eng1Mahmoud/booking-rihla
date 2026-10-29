'use client';
import { useLocale } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getBookingsAction,
  createBookingAction,
  checkoutAction,
} from '../actions/bookings.actions';
import type { CreateBookingInput } from '../schemas/bookingSchema';
import { invokeAction } from '@/shared/lib/apiResult';
import { bookingKeys } from './queryKeys';
import type { BookingListPage } from '../types/booking';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useCreateBooking() {
  return useMutation({
    mutationFn: (input: CreateBookingInput) =>
      invokeAction(() => createBookingAction(input)),
  });
}
export function useCheckout() {
  return useMutation({
    mutationFn: ({ id, prepare }: { id: string; prepare: boolean }) => {
      // One key for the entire action; never replay an uncertain payment.
      const idempotencyKey = prepare ? crypto.randomUUID() : undefined;
      return invokeAction(() =>
        checkoutAction({ id, prepare, idempotencyKey }),
      );
    },
  });
}
export function useBookings(
  initial: BookingListPage,
  userId: string,
  readAt: number,
) {
  const locale = useLocale();
  const { user } = useAuth();
  const { offset, filter } = initial.pagination;
  const query = useQuery({
    queryKey: bookingKeys.list(userId, locale, offset, filter),
    queryFn: () => invokeAction(() => getBookingsAction(offset, filter)),
    initialData: initial,
    initialDataUpdatedAt: readAt,
    enabled: user?.id === userId,
    staleTime: 0,
  });
  return {
    ...query,
    user,
    data: query.dataUpdatedAt < readAt ? initial : query.data,
    isError: query.isError && query.errorUpdatedAt >= readAt,
  };
}
