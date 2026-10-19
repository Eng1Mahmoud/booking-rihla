import type { ReactNode } from 'react';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
