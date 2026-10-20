'use server';

import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import { apiFetch } from '@/shared/lib/api';
import type { ApiResult } from '@/shared/lib/apiResult';
import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from '../schemas/authSchema';
import {
  recoveryEmailSchema,
  recoveryResetSchema,
  type RecoveryValues,
} from '../schemas/recoverySchema';
import { cookies } from 'next/headers';
import { readAuthCookies } from '@/shared/lib/session';
import type {
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
} from '../types/auth';

// Actions are public POST entrypoints: validate again on the server, not only in the form.
async function submit<T>(
  path: string,
  input: unknown,
  schema: z.ZodType,
): Promise<ApiResult<T>> {
  const locale = await getLocale();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message:
        locale === 'ar'
          ? 'راجع البيانات المدخلة وحاول مجددًا.'
          : 'Check your details and try again.',
    };
  }
  // apiFetch keeps tokens private and authenticates protected mutations before sending them.
  return apiFetch<T>(path, {
    method: 'POST',
    body: parsed.data,
    locale,
    context: 'action',
  });
}

export async function loginAction(input: LoginInput) {
  return submit<{ user: AuthUser }>('auth/login', input, loginSchema);
}

export async function registerAction(input: RegisterInput) {
  return submit<{ verificationId: string }>(
    'auth/register',
    input,
    registerSchema.extend({ language: z.enum(['ar', 'en']) }),
  );
}

export async function verifyEmailAction(
  input: z.input<typeof verifyEmailSchema>,
) {
  return submit('auth/verify-email', input, verifyEmailSchema);
}

export async function resendVerificationAction(
  input: z.input<typeof resendVerificationSchema>,
) {
  return submit('auth/resend-verification', input, resendVerificationSchema);
}

export async function forgotPasswordAction(input: { email: string }) {
  return submit('auth/forgot-password', input, recoveryEmailSchema);
}

export async function resetPasswordAction(input: RecoveryValues) {
  return submit('auth/reset-password', input, recoveryResetSchema);
}

export async function logoutAction(all = false) {
  // Current-device logout uses the refresh credential; logout-all also requires a live user.
  // apiFetch checks auth/me inside this action before calling auth/logout-all.
  return submit(
    all === true ? 'auth/logout-all' : 'auth/logout',
    all,
    z.boolean().transform(() => ({})),
  );
}

export async function getCurrentUserAction(): Promise<ApiResult<AuthSession>> {
  const session = readAuthCookies({ cookies: await cookies() });
  if (!session.access && !session.refresh)
    return {
      success: true,
      status: 200,
      code: 'OK',
      message: 'OK',
      data: { user: null },
    };
  const result = await apiFetch<AuthUser>('auth/me', { context: 'action' });
  return {
    ...result,
    data: result.success && result.data ? { user: result.data } : undefined,
  };
}
