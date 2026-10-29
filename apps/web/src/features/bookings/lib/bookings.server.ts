import 'server-only';
import { apiFetch } from '@/shared/lib/api';
import { getSignedInUser } from '@/features/auth/lib/auth.server';
import {
  ApiError,
  getApiDataOrThrow,
  type ApiResult,
} from '@/shared/lib/apiResult';
import type {
  Booking,
  BookingPaymentData,
  BookingDetails,
  PaymentState,
} from '../types/booking';

// Shared by page reads and polling; this never reconciles with Paymob.
export async function getBookingPaymentState(
  id: string,
): Promise<ApiResult<PaymentState>> {
  // The payment endpoint checks authentication and booking ownership.
  const [payment, availability] = await Promise.all([
    apiFetch<BookingPaymentData>('bookings/' + id + '/payment'),
    apiFetch<{ checkoutEnabled: boolean }>('payments/availability'),
  ]);
  if (!payment.success || !payment.data) return { ...payment, data: undefined };
  return {
    ...payment,
    data: {
      payment: { ...payment.data, checkoutUrl: undefined },
      // Unavailable checkout must not hide an otherwise readable payment result.
      checkoutEnabled:
        availability.success && availability.data?.checkoutEnabled === true,
    },
  };
}

export async function getBookingDetails(id: string): Promise<BookingDetails> {
  const user = await getSignedInUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED');
  const [booking, paymentState] = await Promise.all([
    apiFetch<Booking>('bookings/' + id),
    getBookingPaymentState(id),
  ]);
  return {
    booking: getApiDataOrThrow(booking),
    ...getApiDataOrThrow(paymentState),
    userId: user.id,
    readAt: Date.now(),
  };
}
