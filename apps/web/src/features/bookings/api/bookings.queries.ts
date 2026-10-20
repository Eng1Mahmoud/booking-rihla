import 'server-only';
import { requireCurrentUser } from '@/features/auth/api/auth.queries';
import { apiFetch } from '@/shared/lib/apiFetch';
import { unwrapApiResult } from '@/shared/lib/apiResult';
import type { Booking, BookingPayment, BookingDetails } from '../types/booking';

export async function getBookings(offset: number) {
  await requireCurrentUser();
  return unwrapApiResult(
    await apiFetch<{
      items: Booking[];
      pagination: { limit: number; offset: number };
    }>('bookings?limit=20&offset=' + offset),
  );
}

export async function getBookingDetails(id: string): Promise<BookingDetails> {
  const user = await requireCurrentUser();
  const [booking, payment, availability] = await Promise.all([
    apiFetch<Booking>('bookings/' + id),
    apiFetch<BookingPayment>('bookings/' + id + '/payment'),
    apiFetch<{ checkoutEnabled: boolean }>('payments/availability', {
      auth: false,
    }),
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
