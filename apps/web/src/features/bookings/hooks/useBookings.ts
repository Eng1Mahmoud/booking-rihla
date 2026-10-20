'use client';
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings.api';
import { isPaymentPending, paymentOutcome } from '../lib/paymentState';
import { queryKeys } from '@/shared/lib/queryClient';
import type { BookingDetails, PaymentState } from '../types/booking';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useCreateBooking() {
  return useMutation({ mutationFn: bookingsApi.create, retry: false });
}
export function useCheckout() {
  return useMutation({ mutationFn: bookingsApi.checkout, retry: false });
}
export function useBookingPayment(
  initial: BookingDetails,
  afterCheckout: boolean,
) {
  const { user } = useAuth();
  const client = useQueryClient();
  const checked = useRef('');
  const key = queryKeys.booking(
    initial.userId,
    initial.booking.id,
    afterCheckout,
  );
  const initialState: PaymentState = {
    payment: initial.payment,
    checkoutEnabled: initial.checkoutEnabled,
  };
  const query = useQuery({
    queryKey: key,
    initialData: initialState,
    initialDataUpdatedAt: initial.readAt,
    queryFn: async ({ signal }) => {
      const incoming = await bookingsApi.payment(initial.booking.id, signal);
      const current = client.getQueryData<PaymentState>(key);
      // An older in-flight GET must not replace a newer reconciliation result.
      return current &&
        Date.parse(current.payment.serverTime) >
          Date.parse(incoming.payment.serverTime)
        ? current
        : incoming;
    },
    enabled: user?.id === initial.userId,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (q) => {
      const state =
        q.state.dataUpdatedAt < initial.readAt ? initialState : q.state.data;
      if (!state) return false;
      const payment = state.payment;
      return (afterCheckout &&
        ['waiting', 'processing'].includes(paymentOutcome(payment))) ||
        ['NOT_STARTED', 'PREPARED'].includes(payment.paymentStatus) ||
        isPaymentPending(payment.paymentStatus) ||
        ['PENDING', 'REQUESTED', 'UNKNOWN'].includes(payment.refundStatus ?? '')
        ? afterCheckout
          ? 3000
          : 5000
        : false;
    },
  });
  // A fresh server snapshot wins over an older browser cache immediately.
  const data = query.dataUpdatedAt < initial.readAt ? initialState : query.data;
  useEffect(() => {
    if (
      !afterCheckout ||
      user?.id !== initial.userId ||
      !['waiting', 'processing', 'expired'].includes(
        paymentOutcome(data.payment),
      )
    )
      return;
    const id = initial.userId + ':' + initial.booking.id;
    if (checked.current === id) return;
    checked.current = id;
    // One explicit reconciliation action on return; status polling itself never calls Paymob.
    void bookingsApi
      .refreshPayment(initial.booking.id)
      .then((payment) => {
        client.setQueryData<PaymentState>(key, (current) => ({
          payment:
            current &&
            Date.parse(current.payment.serverTime) >
              Date.parse(payment.serverTime)
              ? current.payment
              : payment,
          checkoutEnabled: current?.checkoutEnabled ?? data.checkoutEnabled,
        }));
      })
      .catch(() => {
        void client.invalidateQueries({ queryKey: key });
      });
  }, [
    afterCheckout,
    user?.id,
    initial.userId,
    initial.booking.id,
    client,
    data,
    key,
  ]);
  return {
    ...query,
    data,
    dataUpdatedAt: Math.max(initial.readAt, query.dataUpdatedAt),
    isError: query.isError && query.errorUpdatedAt >= initial.readAt,
  };
}
