'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, isUnauthenticated } from '@/shared/lib/apiResult';
import { resetAuthCache } from '@/features/auth/hooks/useAuth';
import {
  QueryClientProvider,
  HydrationBoundary,
  type QueryClient,
  type DehydratedState,
} from '@tanstack/react-query';
import { createQueryClient } from '@/shared/lib/queryClient';
export function AppProviders({
  children,
  state,
}: {
  children: ReactNode;
  state: DehydratedState;
}) {
  const router = useRouter();
  const [client] = useState(() => {
    let clearing = false;
    const queries: QueryClient = createQueryClient((error) => {
      if (!(error instanceof ApiError) || !isUnauthenticated(error) || clearing)
        return;
      clearing = true;
      void resetAuthCache(queries)
        .then(() => router.refresh())
        .finally(() => {
          clearing = false;
        });
    });
    return queries;
  });
  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={state}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
