'use server';

import { fetchWhenSignedIn } from '@/features/auth/lib/auth.server';
import type { ApiResult } from '@/shared/lib/apiResult';
import { parseSchema } from '@/shared/lib/parseSchema';
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
  BookingPayment,
  BookingListPage,
} from '../types/booking';

export async function createBookingAction(input: CreateBookingInput) {
  const parsed = await parseSchema(createBookingSchema, input);
  if (!parsed.success) return parsed.error;
  return fetchWhenSignedIn<Booking>('bookings', {
    method: 'POST',
    body: parsed.data,
  });
}

export async function checkoutAction(
  input: CheckoutInput,
): Promise<ApiResult<BookingPayment>> {
  const parsed = await parseSchema(checkoutSchema, input);
  if (!parsed.success) return parsed.error;
  const { id, prepare, idempotencyKey } = parsed.data;
  const owned = await fetchWhenSignedIn<Booking>('bookings/' + id);
  if (!owned.success) return { ...owned, data: undefined };
  if (prepare) {
    const attempt = await fetchWhenSignedIn(
      'bookings/' + id + '/payment-attempt',
      {
        method: 'POST',
        body: {},
        headers: { 'Idempotency-Key': idempotencyKey! },
      },
    );
    if (
      !attempt.success &&
      !(attempt.status === 409 && attempt.code === 'PAYMENT_ATTEMPT_EXISTS')
    )
      return { ...attempt, data: undefined };
  }
  return fetchWhenSignedIn<BookingPayment>('bookings/' + id + '/checkout', {
    method: 'POST',
    body: {},
  });
}

export async function refreshPaymentAction(
  id: string,
): Promise<ApiResult<BookingPayment>> {
  const parsed = await parseSchema(bookingIdSchema, id);
  if (!parsed.success) return parsed.error;
  const owned = await fetchWhenSignedIn<Booking>('bookings/' + parsed.data);
  if (!owned.success) return { ...owned, data: undefined };
  return fetchWhenSignedIn<BookingPayment>(
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
  return fetchWhenSignedIn<BookingListPage>(
    'bookings?limit=20&offset=' +
      parsed.data.offset +
      '&filter=' +
      parsed.data.filter,
  );
}
