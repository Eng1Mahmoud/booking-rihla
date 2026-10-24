import 'server-only';

import { apiFetch } from '@/shared/lib/api';
import { getSignedInUser } from '@/features/auth/lib/auth.server';
import { ApiError, getApiDataOrThrow } from '@/shared/lib/apiResult';
import type { Booking, BookingPayment, BookingDetails } from '../types/booking';

export async function getBookingDetails(id: string): Promise<BookingDetails> {
  const user = await getSignedInUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED');
  const [booking, payment, availability] = await Promise.all([
    apiFetch<Booking>('bookings/' + id),
    apiFetch<BookingPayment>('bookings/' + id + '/payment'),
    apiFetch<{ checkoutEnabled: boolean }>('payments/availability'),
  ]);
  return {
    booking: getApiDataOrThrow(booking),
    payment: { ...getApiDataOrThrow(payment), checkoutUrl: undefined },
    checkoutEnabled:
      availability.success && availability.data?.checkoutEnabled === true,
    userId: user.id,
    readAt: Date.now(),
  };
}
