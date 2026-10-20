'use client';
import { useState, type ReactNode } from 'react';
import {
  QueryClientProvider,
  HydrationBoundary,
  type DehydratedState,
} from '@tanstack/react-query';
import { createQueryClient } from '@/shared/lib/queryClient';
import { AuthSessionSync } from '@/features/auth/components/AuthSessionSync';
export function AppProviders({
  children,
  state,
}: {
  children: ReactNode;
  state: DehydratedState;
}) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={state}>
        <AuthSessionSync />
        {children}
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
