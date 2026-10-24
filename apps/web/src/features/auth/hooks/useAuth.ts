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
import { authKeys } from '@/features/auth/hooks/queryKeys';
import { useRouter } from 'next/navigation';
export async function resetAuthCache(client: QueryClient) {
  await client.cancelQueries();
  client.removeQueries({
    predicate: (query) => query.queryKey[0] !== authKeys.all[0],
  });
  client.setQueryData<AuthSession>(authKeys.me, { user: null });
}
export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: authKeys.mutation('login'),
    mutationFn: (input: LoginInput) => invokeAction(() => loginAction(input)),
    onSuccess: async () => {
      await resetAuthCache(client);
      // Fetch user data through auth/me, never from the login response.
      await client.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}
export function useLogout() {
  const client = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationKey: authKeys.mutation('logout'),
    mutationFn: (all: boolean = false) => invokeAction(() => logoutAction(all)),
    onSuccess: async () => {
      await resetAuthCache(client);
      router.refresh();
    },
  });
}
export function useAuth() {
  const query = useQuery<AuthSession>({
    queryKey: authKeys.me,
    queryFn: () => invokeAction(getCurrentUserAction),
    staleTime: 60000,
  });
  const router = useRouter();
  const expired =
    query.isError &&
    query.error instanceof ApiError &&
    query.error.status === 401 &&
    query.error.code === 'UNAUTHENTICATED';
  let status: 'guest' | 'unavailable' | 'signed-in' | 'loading' = 'loading';
  if (expired) status = 'guest';
  else if (query.isError || query.data?.error) status = 'unavailable';
  else if (query.data?.user) status = 'signed-in';
  else if (query.data) status = 'guest';
  return {
    user: status === 'signed-in' ? (query.data?.user ?? null) : null,
    status,
    reloadSession: async () => {
      const result = await query.refetch();
      if (result.isSuccess) router.refresh();
    },
  };
}

export function useRegister() {
  return useMutation({
    mutationKey: authKeys.mutation('register'),
    mutationFn: (input: RegisterInput) =>
      invokeAction(() => registerAction(input)),
  });
}
export function useVerifyEmail() {
  return useMutation({
    mutationKey: authKeys.mutation('verify-email'),
    mutationFn: (input: Parameters<typeof verifyEmailAction>[0]) =>
      invokeAction(() => verifyEmailAction(input)),
  });
}
export function useResendVerification() {
  return useMutation({
    mutationKey: authKeys.mutation('resend-verification'),
    mutationFn: (input: Parameters<typeof resendVerificationAction>[0]) =>
      invokeAction(() => resendVerificationAction(input)),
  });
}
export function useForgotPassword() {
  return useMutation({
    mutationKey: authKeys.mutation('forgot-password'),
    mutationFn: (input: { email: string }) =>
      invokeAction(() => forgotPasswordAction(input)),
  });
}
export function useResetPassword() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: authKeys.mutation('reset-password'),
    mutationFn: (input: RecoveryValues) =>
      invokeAction(() => resetPasswordAction(input)),
    onSuccess: () => resetAuthCache(client),
  });
}
