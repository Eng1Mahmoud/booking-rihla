import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

export const createQueryClient = (onError?: (error: Error) => void) =>
  new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: { retry: false, staleTime: 15000 },
      mutations: { retry: false },
    },
  });
