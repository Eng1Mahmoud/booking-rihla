import type { ReactNode } from 'react';
import { RequireAuth } from '@/features/auth/components/require-auth';
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
