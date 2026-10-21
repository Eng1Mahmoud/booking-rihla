export const seatKeys = {
  list: (locale: string, tripId: string) =>
    ['seats', 'list', locale, tripId] as const,
};
