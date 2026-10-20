import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiResult';
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
