'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_EXPIRED_EVENT } from '@/shared/lib/apiClient';
import { clearAuthCache } from '../hooks/useAuth';
export function AuthSessionSync() {
  const client = useQueryClient();
  useEffect(() => {
    const expired = () => {
      void clearAuthCache(client);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  }, [client]);
  return null;
}
