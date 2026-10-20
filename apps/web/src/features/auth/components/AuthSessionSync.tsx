'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SESSION_EXPIRED_EVENT } from '@/shared/lib/apiResult';
import { clearAuthCache } from '../hooks/useAuth';
export function AuthSessionSync() {
  const client = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    const expired = () => {
      void clearAuthCache(client);
      // Rerun the protected layout so it redirects to login with returnTo.
      router.refresh();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  }, [client, router]);
  return null;
}
