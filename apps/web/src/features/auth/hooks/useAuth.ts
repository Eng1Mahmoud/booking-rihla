'use client';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  getCurrentUserAction,
  loginAction,
  logoutAction,
  registerAction,
  verifyEmailAction,
  resendVerificationAction,
  forgotPasswordAction,
  resetPasswordAction,
} from '../actions/auth.actions';
import { ApiError, invokeAction } from '@/shared/lib/apiResult';
import type { LoginInput, RegisterInput } from '../types/auth';
import type { RecoveryValues } from '../schemas/recoverySchema';
import type { AuthSession } from '../types/auth';
import { authKeys } from '@/features/auth/hooks/auth.queries';
import { useRouter } from 'next/navigation';
export async function clearAuthCache(client: QueryClient) {
  await client.cancelQueries();
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
  client.setQueryData<AuthSession>(authKeys.me, { user: null });
}
export function useCurrentUser() {
  // SSR supplies the first safe user view; TanStack refreshes through a Server Action.
  return useQuery<AuthSession>({
    queryKey: authKeys.me,
    queryFn: () => invokeAction(getCurrentUserAction),
    staleTime: 60000,
    retry: false,
  });
}
export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['auth', 'useLogin'],
    mutationFn: async (input: LoginInput) =>
      (await invokeAction(() => loginAction(input))).user,
    retry: false,
    onSuccess: async (user) => {
      await client.cancelQueries();
      client.removeQueries({
        predicate: (entry) => entry.queryKey[0] !== 'auth',
      });
      client.setQueryData<AuthSession>(authKeys.me, { user });
    },
  });
}
export function useLogout() {
  const client = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationKey: ['auth', 'useLogout'],
    mutationFn: (all: boolean = false) => invokeAction(() => logoutAction(all)),
    retry: false,
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
  const expired =
    query.isError &&
    query.error instanceof ApiError &&
    query.error.status === 401 &&
    query.error.code === 'UNAUTHENTICATED';
  const status = expired
    ? 'guest'
    : query.isError || query.data?.error
      ? 'unavailable'
      : query.data?.user
        ? 'signed-in'
        : query.data
          ? 'guest'
          : 'loading';
  return {
    user: status === 'signed-in' ? (query.data?.user ?? null) : null,
    status,
    clearSession: () => clearAuthCache(client),
    reloadSession: async () => {
      const result = await query.refetch();
      if (result.isSuccess) router.refresh();
    },
  };
}

export function useRegister() {
  return useMutation({
    mutationKey: ['auth', 'useRegister'],
    mutationFn: (input: RegisterInput) =>
      invokeAction(() => registerAction(input)),
    retry: false,
  });
}
export function useVerifyEmail() {
  return useMutation({
    mutationKey: ['auth', 'useVerifyEmail'],
    mutationFn: (input: Parameters<typeof verifyEmailAction>[0]) =>
      invokeAction(() => verifyEmailAction(input)),
    retry: false,
  });
}
export function useResendVerification() {
  return useMutation({
    mutationKey: ['auth', 'useResendVerification'],
    mutationFn: (input: Parameters<typeof resendVerificationAction>[0]) =>
      invokeAction(() => resendVerificationAction(input)),
    retry: false,
  });
}
export function useForgotPassword() {
  return useMutation({
    mutationKey: ['auth', 'useForgotPassword'],
    mutationFn: (input: { email: string }) =>
      invokeAction(() => forgotPasswordAction(input)),
    retry: false,
  });
}
export function useResetPassword() {
  return useMutation({
    mutationKey: ['auth', 'useResetPassword'],
    mutationFn: (input: RecoveryValues) =>
      invokeAction(() => resetPasswordAction(input)),
    retry: false,
  });
}
