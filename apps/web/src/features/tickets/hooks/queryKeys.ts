export const ticketKeys = {
  detail: (userId: string, locale: string, bookingId: string) =>
    ['tickets', 'detail', userId, locale, bookingId] as const,
};
