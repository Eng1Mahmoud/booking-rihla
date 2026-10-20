import { apiClient, invokeAction } from '@/shared/lib/apiClient';
import {
  loginAction,
  logoutAction,
  registerAction,
  verifyEmailAction,
  resendVerificationAction,
  forgotPasswordAction,
  resetPasswordAction,
} from '../actions/auth.actions';
import type { AuthUser, LoginInput, RegisterInput } from '../types/auth';
import type { RecoveryValues } from '../schemas/recoverySchema';

export const authApi = {
  // Transitional read only; this will move with the account Server Component migration.
  me: async (signal?: AbortSignal) =>
    (await apiClient.get<{ data: AuthUser }>('auth/me', { signal })).data,
  login: async (input: LoginInput) =>
    (await invokeAction(() => loginAction(input))).user,
  logout: (all = false) => invokeAction(() => logoutAction(all)),
  register: (input: RegisterInput) => invokeAction(() => registerAction(input)),
  verifyEmail: (input: {
    email: string;
    verificationId: string;
    code: string;
  }) => invokeAction(() => verifyEmailAction(input)),
  resendVerification: (input: { email: string; verificationId: string }) =>
    invokeAction(() => resendVerificationAction(input)),
  forgotPassword: (input: { email: string }) =>
    invokeAction(() => forgotPasswordAction(input)),
  resetPassword: (input: RecoveryValues) =>
    invokeAction(() => resetPasswordAction(input)),
};
