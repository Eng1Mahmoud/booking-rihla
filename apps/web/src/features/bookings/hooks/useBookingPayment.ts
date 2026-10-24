'use client';
import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getPaymentStatusAction,
  refreshPaymentAction,
} from '../actions/bookings.actions';
import { isPaymentPending, paymentOutcome } from '../lib/paymentState';
import { bookingKeys } from './queryKeys';
import type { BookingDetails, PaymentState } from '../types/booking';

export function useBookingPayment(
  initial: BookingDetails,
  afterCheckout: boolean,
) {
  const { user } = useAuth();
  const locale = useLocale();
  const client = useQueryClient();
  const checked = useRef('');
  const key = bookingKeys.payment(
    initial.userId,
    locale,
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
      signal.throwIfAborted();
      const incoming = await invokeAction(() =>
        getPaymentStatusAction(initial.booking.id),
      );
      // Actions cannot receive AbortSignal; ignore the result if this query was cancelled.
      signal.throwIfAborted();
      const current = client.getQueryData<PaymentState>(key);
      // An older in-flight status read must not replace a newer reconciliation result.
      return current &&
        Date.parse(current.payment.serverTime) >
          Date.parse(incoming.payment.serverTime)
        ? current
        : incoming;
    },
    enabled: user?.id === initial.userId,
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
  const { mutate: refreshPayment } = useMutation({
    mutationFn: () =>
      invokeAction(() => refreshPaymentAction(initial.booking.id)),
    onSuccess: (payment) => {
      client.setQueryData<PaymentState>(key, (current) => ({
        payment:
          current &&
          Date.parse(current.payment.serverTime) >
            Date.parse(payment.serverTime)
            ? current.payment
            : payment,
        checkoutEnabled: current?.checkoutEnabled ?? data.checkoutEnabled,
      }));
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: key });
    },
  });
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
    // One explicit reconciliation action on return; status polling never calls Paymob.
    refreshPayment();
  }, [
    afterCheckout,
    user?.id,
    initial.userId,
    initial.booking.id,
    refreshPayment,
    data,
  ]);
  return {
    ...query,
    data,
    dataUpdatedAt: Math.max(initial.readAt, query.dataUpdatedAt),
    isError: query.isError && query.errorUpdatedAt >= initial.readAt,
  };
}
