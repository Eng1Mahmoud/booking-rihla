import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiClient';
export const queryKeys = {
  me: ['auth', 'me'] as const,
  bookings: (userId: string | undefined, offset: number) =>
    ['owned-bookings', userId, offset] as const,
  booking: (userId: string | undefined, id: string) =>
    ['owned-booking', userId, id] as const,
  ticket: (userId: string | undefined, id: string) =>
    ['owned-ticket', userId, id] as const,
  seats: (id: string) => ['trip-seats', id] as const,
  checkoutAvailability: ['checkout-availability'] as const,
};
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, error) =>
          !(
            error instanceof ApiError &&
            [401, 403].includes(error.status)
          ) && count < 1,
        staleTime: 15000,
      },
      mutations: { retry: false },
    },
  });
