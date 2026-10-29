'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ApiResult } from '@/shared/lib';
import { parseSchema } from '@/shared/lib/parseSchema';
import { getBookingPaymentState } from '../lib/bookings.server';
import {
  createBookingSchema,
  bookingIdSchema,
  bookingsListInputSchema,
  type BookingFilter,
  checkoutSchema,
  type CreateBookingInput,
  type CheckoutInput,
} from '../schemas/bookingSchema';
import type {
  Booking,
  BookingPaymentData,
  BookingListPage,
  PaymentState,
} from '../types/booking';

export async function createBookingAction(input: CreateBookingInput) {
  const parsed = await parseSchema(createBookingSchema, input);
  if (!parsed.success) return parsed.error;
  return apiFetch<Booking>('bookings', {
    method: 'POST',
    body: parsed.data,
  });
}

export async function checkoutAction(
  input: CheckoutInput,
): Promise<ApiResult<BookingPaymentData>> {
  const parsed = await parseSchema(checkoutSchema, input);
  if (!parsed.success) return parsed.error;
  const { id, prepare, idempotencyKey } = parsed.data;
  const owned = await apiFetch<Booking>('bookings/' + id);
  if (!owned.success) return { ...owned, data: undefined };
  if (prepare) {
    const attempt = await apiFetch('bookings/' + id + '/payment-attempt', {
      method: 'POST',
      body: {},
      headers: { 'Idempotency-Key': idempotencyKey! },
    });
    if (
      !attempt.success &&
      !(attempt.status === 409 && attempt.code === 'PAYMENT_ATTEMPT_EXISTS')
    )
      return { ...attempt, data: undefined };
  }
  return apiFetch<BookingPaymentData>('bookings/' + id + '/checkout', {
    method: 'POST',
    body: {},
  });
}

export async function refreshPaymentAction(
  id: string,
): Promise<ApiResult<BookingPaymentData>> {
  const parsed = await parseSchema(bookingIdSchema, id);
  if (!parsed.success) return parsed.error;
  const owned = await apiFetch<Booking>('bookings/' + parsed.data);
  if (!owned.success) return { ...owned, data: undefined };
  return apiFetch<BookingPaymentData>(
    'bookings/' + parsed.data + '/payment/refresh',
    {
      method: 'POST',
      body: {},
    },
  );
}

export async function getBookingsAction(
  offset: number,
  filter: BookingFilter = 'all',
) {
  const parsed = await parseSchema(bookingsListInputSchema, { offset, filter });
  if (!parsed.success) return parsed.error;
  return apiFetch<BookingListPage>(
    'bookings?limit=20&offset=' +
      parsed.data.offset +
      '&filter=' +
      parsed.data.filter,
  );
}

// Read stored status only. Reconciliation with Paymob remains a separate action.
export async function getPaymentStatusAction(
  id: string,
): Promise<ApiResult<PaymentState>> {
  const parsed = await parseSchema(bookingIdSchema, id);
  if (!parsed.success) return parsed.error;
  return getBookingPaymentState(parsed.data);
}
