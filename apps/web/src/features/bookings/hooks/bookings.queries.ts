export const bookingKeys = {
  list: (userId: string, locale: string, offset: number) =>
    ['bookings', userId, locale, offset] as const,
  payment: (
    userId: string,
    locale: string,
    id: string,
    afterCheckout: boolean,
  ) => ['owned-payment', userId, locale, id, afterCheckout] as const,
};
