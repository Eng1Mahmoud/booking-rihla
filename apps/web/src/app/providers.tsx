'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SESSION_EXPIRED_EVENT } from '@/shared/lib/apiResult';
import { resetAuthCache } from '@/features/auth/hooks/useAuth';
import {
  QueryClientProvider,
  HydrationBoundary,
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
  const [client] = useState(createQueryClient);
  const router = useRouter();
  useEffect(() => {
    const expired = () => {
      void resetAuthCache(client).then(() => router.refresh());
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  }, [client, router]);
  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={state}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
