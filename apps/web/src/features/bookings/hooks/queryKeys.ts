export const bookingKeys = {
  list: (userId: string, locale: string, offset: number) =>
    ['bookings', 'list', userId, locale, offset] as const,
  payment: (
    userId: string,
    locale: string,
    id: string,
    afterCheckout: boolean,
  ) => ['bookings', 'payment', userId, locale, id, afterCheckout] as const,
};
