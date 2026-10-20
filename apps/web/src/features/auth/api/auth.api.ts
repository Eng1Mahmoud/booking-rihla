import { apiClient, SESSION_EXPIRED_EVENT } from '@/shared/lib/apiClient';
import {
  ApiError,
  unwrapApiResult,
  type ApiResult,
} from '@/shared/lib/apiResult';
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

// Adapt serializable action results to the existing form/React Query error handling.
async function invoke<T>(action: () => Promise<ApiResult<T>>): Promise<T> {
  let result: ApiResult<T>;
  try {
    result = await action();
  } catch {
    // The outcome is unknown if the action response is lost; never retry it automatically.
    throw new ApiError(0, 'NETWORK_ERROR');
  }
  if (
    !result.success &&
    result.status === 401 &&
    result.code === 'UNAUTHENTICATED'
  ) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return unwrapApiResult(result);
}

export const authApi = {
  // Transitional read only; this will move with the account Server Component migration.
  me: async (signal?: AbortSignal) =>
    (await apiClient.get<{ data: AuthUser }>('auth/me', { signal })).data,
  login: async (input: LoginInput) =>
    (await invoke(() => loginAction(input))).user,
  logout: (all = false) => invoke(() => logoutAction(all)),
  register: (input: RegisterInput) => invoke(() => registerAction(input)),
  verifyEmail: (input: {
    email: string;
    verificationId: string;
    code: string;
  }) => invoke(() => verifyEmailAction(input)),
  resendVerification: (input: { email: string; verificationId: string }) =>
    invoke(() => resendVerificationAction(input)),
  forgotPassword: (input: { email: string }) =>
    invoke(() => forgotPasswordAction(input)),
  resetPassword: (input: RecoveryValues) =>
    invoke(() => resetPasswordAction(input)),
};
