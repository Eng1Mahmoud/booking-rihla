'use client';
import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/shared/lib/queryClient';
import { AuthSessionSync } from '@/features/auth/components/AuthSessionSync';
export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <AuthSessionSync />
      {children}
    </QueryClientProvider>
  );
}
