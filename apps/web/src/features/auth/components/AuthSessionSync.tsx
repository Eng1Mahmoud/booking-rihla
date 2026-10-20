'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SESSION_EXPIRED_EVENT } from '@/shared/lib/apiClient';
import { clearAuthCache } from '../hooks/useAuth';
export function AuthSessionSync() {
  const client = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    const expired = () => {
      void clearAuthCache(client);
      router.refresh();
    };
    // Other tabs/device revocations are discovered by a server render on focus.
    let timer: ReturnType<typeof setTimeout>;
    const focus = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 100);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [client, router]);
  return null;
}
