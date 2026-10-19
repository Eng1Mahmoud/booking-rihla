import { apiClient, BrowserApiError } from '@/shared/lib/apiClient';
import type { Booking, BookingPayment } from '../types/booking';
export type CreateBookingInput = {
  tripId: string;
  contactPhone: string;
  passengers: { seatId: string; name: string }[];
};
export const bookingsApi = {
  list: (offset: number, signal?: AbortSignal) =>
    apiClient.get<{ data: Booking[] }>('bookings?limit=20&offset=' + offset, {
      signal,
    }),
  create: (input: CreateBookingInput) =>
    apiClient.post<{ data: Booking }>('bookings', input),
  details: async (id: string, signal?: AbortSignal) => {
    const [booking, payment] = await Promise.all([
      apiClient.get<{ data: Booking }>('bookings/' + id, { signal }),
      apiClient.get<{ data: BookingPayment }>('bookings/' + id + '/payment', {
        signal,
      }),
    ]);
    return { booking: booking.data, payment: payment.data };
  },
  availability: async () =>
    (
      await apiClient.get<{ data: { checkoutEnabled: boolean } }>(
        'payments/availability',
      )
    ).data,
  refreshPayment: (id: string) =>
    apiClient.post('bookings/' + id + '/payment/refresh'),
  checkout: async ({ id, prepare }: { id: string; prepare: boolean }) => {
    if (prepare) {
      try {
        await apiClient.post(
          'bookings/' + id + '/payment-attempt',
          {},
          { headers: { 'Idempotency-Key': crypto.randomUUID() } },
        );
      } catch (error) {
        if (
          !(error instanceof BrowserApiError) ||
          error.code !== 'PAYMENT_ATTEMPT_EXISTS'
        )
          throw error;
      }
    }
    return (
      await apiClient.post<{ data: BookingPayment }>(
        'bookings/' + id + '/checkout',
      )
    ).data;
  },
};
