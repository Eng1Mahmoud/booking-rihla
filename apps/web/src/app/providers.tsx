'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/shared/lib/apiResult';
import { resetAuthCache } from '@/features/auth/hooks/useAuth';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '@/shared/lib/queryClient';
export function AppProviders({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [client] = useState(() => {
    let clearing = false;
    const queries: QueryClient = createQueryClient((error) => {
      if (
        !(error instanceof ApiError) ||
        error.status !== 401 ||
        error.code !== 'UNAUTHENTICATED' ||
        clearing
      )
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
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
