'use server';

import { getLocale } from 'next-intl/server';
import { apiFetch } from '@/shared/lib/api';
import { validationError, type ApiResult } from '@/shared/lib/apiResult';
import {
  createBookingSchema,
  bookingIdSchema,
  checkoutSchema,
  type CreateBookingInput,
  type CheckoutInput,
} from '../schemas/bookingSchema';
import type { Booking, BookingPayment } from '../types/booking';

async function invalidInput(): Promise<ApiResult<never>> {
  const locale = await getLocale();
  return validationError(locale);
}

export async function createBookingAction(input: CreateBookingInput) {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) return invalidInput();
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
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return invalidInput();
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
  const parsed = bookingIdSchema.safeParse(id);
  if (!parsed.success) return invalidInput();
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
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
    return invalidInput();
  return apiFetch<{
    items: Booking[];
    pagination: { limit: number; offset: number };
  }>('bookings?limit=20&offset=' + offset, { context: 'action' });
}
