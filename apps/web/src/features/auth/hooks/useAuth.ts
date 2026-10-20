'use client';
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { AuthSession } from '../types/auth';
import { queryKeys } from '@/shared/lib/queryClient';
import { useRouter } from 'next/navigation';
export async function clearAuthCache(client: QueryClient) {
  await client.cancelQueries();
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
  client.setQueryData<AuthSession>(queryKeys.me, { user: null });
}
export function useCurrentUser() {
  // The layout hydrates this cache. Refresh it through router.refresh(), not a read action/API.
  return useQuery<AuthSession>({
    queryKey: queryKeys.me,
    queryFn: skipToken,
    staleTime: Infinity,
  });
}
export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (user) => {
      await client.cancelQueries();
      client.removeQueries({
        predicate: (entry) => entry.queryKey[0] !== 'auth',
      });
      client.setQueryData<AuthSession>(queryKeys.me, { user });
    },
  });
}
export function useLogout() {
  const client = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      await clearAuthCache(client);
      router.refresh();
    },
  });
}
export function useAuth() {
  const query = useCurrentUser();
  const client = useQueryClient();
  const router = useRouter();
  const status = query.data?.user
    ? 'signed-in'
    : query.data?.error
      ? 'unavailable'
      : query.data
        ? 'guest'
        : 'loading';
  return {
    user: query.data?.user ?? null,
    status,
    clearSession: () => clearAuthCache(client),
    reloadSession: () => router.refresh(),
  };
}
