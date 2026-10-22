import 'server-only';
import { requireCurrentUser, readApi } from '@/features/auth/lib/auth.server';
import { unwrapApiResult } from '@/shared/lib/apiResult';
import type { Booking, BookingPayment, BookingDetails } from '../types/booking';

export async function getBookingDetails(id: string): Promise<BookingDetails> {
  const user = await requireCurrentUser();
  const [booking, payment, availability] = await Promise.all([
    readApi<Booking>('bookings/' + id),
    readApi<BookingPayment>('bookings/' + id + '/payment'),
    readApi<{ checkoutEnabled: boolean }>('payments/availability'),
  ]);
  return {
    booking: unwrapApiResult(booking),
    // The checkout URL is returned only by the checkout action, not status reads.
    payment: { ...unwrapApiResult(payment), checkoutUrl: undefined },
    checkoutEnabled:
      availability.success && availability.data?.checkoutEnabled === true,
    userId: user.id,
    readAt: Date.now(),
  };
}
