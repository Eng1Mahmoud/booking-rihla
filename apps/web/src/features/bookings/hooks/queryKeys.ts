import type { BookingFilter } from '../schemas/bookingSchema';

export const bookingKeys = {
  list: (
    userId: string,
    locale: string,
    offset: number,
    filter: BookingFilter = 'all',
  ) => ['bookings', 'list', userId, locale, offset, filter] as const,
  payment: (
    userId: string,
    locale: string,
    id: string,
    afterCheckout: boolean,
  ) => ['bookings', 'payment', userId, locale, id, afterCheckout] as const,
};
