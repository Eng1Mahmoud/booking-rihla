import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiResult';
export const queryKeys = {
  me: ['auth', 'me'] as const,
  booking: (userId: string, id: string, afterCheckout: boolean) =>
    ['owned-payment', userId, id, afterCheckout] as const,
};
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, error) =>
          !(error instanceof ApiError && [401, 403].includes(error.status)) &&
          count < 1,
        staleTime: 15000,
      },
      mutations: { retry: false },
    },
  });
