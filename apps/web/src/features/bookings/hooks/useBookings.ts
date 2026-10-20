'use client';
import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBookingsAction,
  createBookingAction,
  checkoutAction,
  refreshPaymentAction,
} from '../actions/bookings.actions';
import type { CreateBookingInput } from '../schemas/bookingSchema';
import {
  ApiError,
  invokeAction,
  unwrapApiResult,
  SESSION_EXPIRED_EVENT,
} from '@/shared/lib/apiResult';
import { isPaymentPending, paymentOutcome } from '../lib/paymentState';
import { bookingKeys } from './bookings.queries';
import type { Booking, BookingDetails, PaymentState } from '../types/booking';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (input: CreateBookingInput) => ({
      data: await invokeAction(() => createBookingAction(input)),
    }),
    retry: false,
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
    retry: false,
  });
}
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
      const incoming = await pollPayment(initial.booking.id, signal);
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
    void invokeAction(() => refreshPaymentAction(initial.booking.id))
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

// Payment polling keeps its fixed GET endpoint; ordinary feature reads use Actions.
async function pollPayment(
  bookingId: string,
  signal?: AbortSignal,
): Promise<PaymentState> {
  let response: Response;
  try {
    response = await fetch(
      '/api/payments/' + encodeURIComponent(bookingId) + '/status',
      {
        cache: 'no-store',
        credentials: 'same-origin',
        signal,
        headers: {
          'Accept-Language': window.location.pathname.startsWith('/ar')
            ? 'ar'
            : 'en',
        },
      },
    );
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR');
  }
  const result = await response.json().catch(() => null);
  if (!result || typeof result.success !== 'boolean')
    throw new ApiError(502, 'UPSTREAM_ERROR');
  if (response.status === 401 && result.code === 'UNAUTHENTICATED')
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  return unwrapApiResult<PaymentState>({ ...result, status: response.status });
}

export function useBookings(
  initial: Booking[],
  userId: string,
  offset: number,
) {
  const locale = useLocale();
  const { user } = useAuth();
  return useQuery({
    queryKey: bookingKeys.list(userId, locale, offset),
    queryFn: () => invokeAction(() => getBookingsAction(offset)),
    initialData: { items: initial, pagination: { limit: 20, offset } },
    enabled: user?.id === userId,
    staleTime: 0,
    retry: false,
  });
}
