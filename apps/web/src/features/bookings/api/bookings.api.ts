import { apiClient, invokeAction } from '@/shared/lib/apiClient';
import type { Booking, BookingPayment } from '../types/booking';
import {
  createBookingAction,
  checkoutAction,
  refreshPaymentAction,
} from '../actions/bookings.actions';
import type { CreateBookingInput } from '../schemas/bookingSchema';
export const bookingsApi = {
  list: (offset: number, signal?: AbortSignal) =>
    apiClient.get<{ data: Booking[] }>('bookings?limit=20&offset=' + offset, {
      signal,
    }),
  create: async (input: CreateBookingInput) => ({
    data: await invokeAction(() => createBookingAction(input)),
  }),
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
  refreshPayment: (id: string) => invokeAction(() => refreshPaymentAction(id)),
  checkout: ({ id, prepare }: { id: string; prepare: boolean }) => {
    // Keep the same client-generated key for the whole action invocation.
    const input = {
      id,
      prepare,
      idempotencyKey: prepare ? crypto.randomUUID() : undefined,
    };
    return invokeAction(() => checkoutAction(input));
  },
};
