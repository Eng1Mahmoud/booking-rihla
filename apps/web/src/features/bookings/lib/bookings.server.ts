import 'server-only';
import {
  requireSignedInUser,
  fetchWithAccessToken,
} from '@/features/auth/lib/auth.server';
import { unwrapApiResult } from '@/shared/lib/apiResult';
import type { Booking, BookingPayment, BookingDetails } from '../types/booking';

export async function getBookingDetails(id: string): Promise<BookingDetails> {
  const user = await requireSignedInUser();
  const [booking, payment, availability] = await Promise.all([
    fetchWithAccessToken<Booking>('bookings/' + id),
    fetchWithAccessToken<BookingPayment>('bookings/' + id + '/payment'),
    fetchWithAccessToken<{ checkoutEnabled: boolean }>('payments/availability'),
  ]);
  return {
    booking: unwrapApiResult(booking),
    payment: { ...unwrapApiResult(payment), checkoutUrl: undefined },
    checkoutEnabled:
      availability.success && availability.data?.checkoutEnabled === true,
    userId: user.id,
    readAt: Date.now(),
  };
}
