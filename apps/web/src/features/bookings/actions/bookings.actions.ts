'use server';

import { apiFetch } from '@/shared/lib/api';
import type { ApiResult } from '@/shared/lib/apiResult';
import { parseSchema } from '@/shared/lib/parseSchema';
import {
  createBookingSchema,
  bookingIdSchema,
  bookingsOffsetSchema,
  checkoutSchema,
  type CreateBookingInput,
  type CheckoutInput,
} from '../schemas/bookingSchema';
import type { Booking, BookingPayment } from '../types/booking';

export async function createBookingAction(input: CreateBookingInput) {
  const parsed = await parseSchema(createBookingSchema, input);
  if (!parsed.success) return parsed.error;
  // apiFetch verifies the live session before sending the reservation once.
  return apiFetch<Booking>('bookings', {
    method: 'POST',
    body: parsed.data,
    context: 'action',
  });
}

export async function checkoutAction(
  input: CheckoutInput,
): Promise<ApiResult<BookingPayment>> {
  const parsed = await parseSchema(checkoutSchema, input);
  if (!parsed.success) return parsed.error;
  const { id, prepare, idempotencyKey } = parsed.data;
  // Check ownership inside the action. Express also enforces it on each mutation.
  const owned = await apiFetch<Booking>('bookings/' + id, {
    context: 'action',
  });
  if (!owned.success) return { ...owned, data: undefined };
  if (prepare) {
    const attempt = await apiFetch('bookings/' + id + '/payment-attempt', {
      method: 'POST',
      body: {},
      headers: { 'Idempotency-Key': idempotencyKey! },
      context: 'action',
    });
    // Only a known existing attempt allows checkout to continue; never retry an uncertain write.
    if (
      !attempt.success &&
      !(attempt.status === 409 && attempt.code === 'PAYMENT_ATTEMPT_EXISTS')
    )
      return { ...attempt, data: undefined };
  }
  return apiFetch<BookingPayment>('bookings/' + id + '/checkout', {
    method: 'POST',
    body: {},
    context: 'action',
  });
}

export async function refreshPaymentAction(
  id: string,
): Promise<ApiResult<BookingPayment>> {
  const parsed = await parseSchema(bookingIdSchema, id);
  if (!parsed.success) return parsed.error;
  const owned = await apiFetch<Booking>('bookings/' + parsed.data, {
    context: 'action',
  });
  if (!owned.success) return { ...owned, data: undefined };
  // One explicit provider inquiry, not the repeating read/polling endpoint.
  return apiFetch<BookingPayment>(
    'bookings/' + parsed.data + '/payment/refresh',
    {
      method: 'POST',
      body: {},
      context: 'action',
    },
  );
}

export async function getBookingsAction(offset: number) {
  const parsed = await parseSchema(bookingsOffsetSchema, offset);
  if (!parsed.success) return parsed.error;
  return apiFetch<{
    items: Booking[];
    pagination: { limit: number; offset: number };
  }>('bookings?limit=20&offset=' + parsed.data, { context: 'action' });
}
