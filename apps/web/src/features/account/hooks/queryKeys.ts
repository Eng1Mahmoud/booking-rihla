export const accountKeys = {
  payments: (userId: string, locale: string, offset: number) =>
    ['account', 'payments', userId, locale, offset] as const,
};
