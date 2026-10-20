import { apiClient } from '@/shared/lib/apiClient';
import type { AuthUser, LoginInput, RegisterInput } from '../types/auth';
import type { RecoveryValues } from '../schemas/recoverySchema';
export const authApi = {
  me: async (signal?: AbortSignal) =>
    (await apiClient.get<{ data: AuthUser }>('auth/me', { signal })).data,
  login: async (input: LoginInput) =>
    (await apiClient.post<{ data: { user: AuthUser } }>('auth/login', input))
      .data.user,
  logout: (all = false) =>
    apiClient.post<void>(all ? 'auth/logout-all' : 'auth/logout'),
  register: async (input: RegisterInput) =>
    (
      await apiClient.post<{ data: { verificationId: string } }>(
        'auth/register',
        input,
      )
    ).data,
  verifyEmail: (input: {
    email: string;
    verificationId: string;
    code: string;
  }) => apiClient.post('auth/verify-email', input),
  resendVerification: (input: { email: string; verificationId: string }) =>
    apiClient.post('auth/resend-verification', input),
  forgotPassword: (input: { email: string }) =>
    apiClient.post('auth/forgot-password', input),
  resetPassword: (input: RecoveryValues) =>
    apiClient.post('auth/reset-password', input),
};
