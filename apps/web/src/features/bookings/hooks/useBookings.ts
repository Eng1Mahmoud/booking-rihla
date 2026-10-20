'use client';
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings.api';
import { isPaymentPending, paymentOutcome } from '../lib/paymentState';
import { queryKeys } from '@/shared/lib/queryClient';
export function useBookings(userId: string | undefined, offset: number) {
  return useQuery({
    queryKey: queryKeys.bookings(userId, offset),
    enabled: Boolean(userId),
    retry: false,
    queryFn: ({ signal }) => bookingsApi.list(offset, signal),
  });
}
export function useCreateBooking() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: bookingsApi.create,
    retry: false,
    onSuccess: (_result, input) =>
      client.invalidateQueries({ queryKey: queryKeys.seats(input.tripId) }),
  });
}
export function useCheckout() {
  return useMutation({ mutationFn: bookingsApi.checkout, retry: false });
}
export function useBookingPayment(
  userId: string | undefined,
  bookingId: string,
  afterCheckout: boolean,
) {
  const queryClient = useQueryClient();
  const immediateCheck = useRef('');
  const availability = useQuery({
    queryKey: queryKeys.checkoutAvailability,
    enabled: Boolean(userId) && !afterCheckout,
    retry: false,
    staleTime: 5000,
    refetchInterval: 15000,
    queryFn: bookingsApi.availability,
  });
  const query = useQuery({
    queryKey: queryKeys.booking(userId, bookingId),
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: Boolean(userId),
    queryFn: ({ signal }) => bookingsApi.details(bookingId, signal),
    retry: false,
    refetchInterval: (q) =>
      q.state.data &&
      ((afterCheckout &&
        ['waiting', 'processing'].includes(
          paymentOutcome(q.state.data.payment),
        )) ||
        q.state.data.booking.paymentRequired ||
        isPaymentPending(q.state.data.payment.paymentStatus) ||
        ['PENDING', 'REQUESTED', 'UNKNOWN'].includes(
          q.state.data.payment.refundStatus ?? '',
        ))
        ? afterCheckout
          ? 3000
          : 5000
        : false,
  });
  useEffect(() => {
    if (!afterCheckout || !userId || !query.isFetchedAfterMount || !query.data)
      return;
    if (
      !['waiting', 'processing', 'expired'].includes(
        paymentOutcome(query.data.payment),
      )
    )
      return;
    const key = userId + ':' + bookingId;
    if (immediateCheck.current === key) return;
    immediateCheck.current = key;
    // One inquiry on return, independent of the background-worker interval.
    void bookingsApi
      .refreshPayment(bookingId)
      .catch(() => undefined)
      .then(() =>
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(userId, bookingId),
        }),
      );
  }, [
    afterCheckout,
    userId,
    bookingId,
    queryClient,
    query.isFetchedAfterMount,
    query.data,
  ]);
  return { query, availability };
}
