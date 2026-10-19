'use client';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { AuthUser } from '../types/auth';
import { ApiError } from '@/shared/lib/apiClient';
import { queryKeys } from '@/shared/lib/queryClient';
export async function clearAuthCache(client: QueryClient) {
  await client.cancelQueries();
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
  client.setQueryData(queryKeys.me, null);
}
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async ({ signal }): Promise<AuthUser | null> => {
      try {
        return await authApi.me(signal);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401)
          return null;
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: 'always',
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
      client.setQueryData(queryKeys.me, user);
    },
  });
}
export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => clearAuthCache(client),
  });
}
export function useAuth() {
  const query = useCurrentUser();
  const client = useQueryClient();
  const status = query.data
    ? 'signed-in'
    : query.data === null
      ? 'guest'
      : query.isError
        ? 'unavailable'
        : 'loading';
  return {
    user: query.data ?? null,
    status,
    clearSession: () => clearAuthCache(client),
    reloadSession: () => query.refetch(),
  };
}
