'use server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { apiFetch } from '@/shared/lib/api';
import { parseSchema } from '@/shared/lib/parseSchema';
import {
  getSessionCookies,
  type AuthTokens,
  deleteSessionCookies,
  setSessionCookies,
} from '@/shared/lib/session';
import { apiFailure, type ApiResult } from '@/shared/lib/apiResult';
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
import type {
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
} from '../types/auth';

export async function loginAction(input: LoginInput): Promise<ApiResult<void>> {
  const parsed = await parseSchema(loginSchema, input);
  if (!parsed.success) return parsed.error;
  const result = await apiFetch<AuthTokens>('auth/login', {
    method: 'POST',
    body: parsed.data,
  });
  if (!result.success) return { ...result, data: undefined };
  if (!result.data) return apiFailure(502, 'UPSTREAM_ERROR', await getLocale());
  setSessionCookies(await cookies(), result.data);
  return { ...result, data: undefined };
}

export async function registerAction(input: RegisterInput) {
  const parsed = await parseSchema(
    registerSchema.extend({ language: z.enum(['ar', 'en']) }),
    input,
  );
  if (!parsed.success) return parsed.error;
  return apiFetch<{ verificationId: string }>('auth/register', {
    method: 'POST',
    body: parsed.data,
  });
}

export async function verifyEmailAction(
  input: z.input<typeof verifyEmailSchema>,
) {
  const parsed = await parseSchema(verifyEmailSchema, input);
  if (!parsed.success) return parsed.error;
  return apiFetch('auth/verify-email', {
    method: 'POST',
    body: parsed.data,
  });
}

export async function resendVerificationAction(
  input: z.input<typeof resendVerificationSchema>,
) {
  const parsed = await parseSchema(resendVerificationSchema, input);
  if (!parsed.success) return parsed.error;
  return apiFetch('auth/resend-verification', {
    method: 'POST',
    body: parsed.data,
  });
}

export async function forgotPasswordAction(input: { email: string }) {
  const parsed = await parseSchema(recoveryEmailSchema, input);
  if (!parsed.success) return parsed.error;
  return apiFetch('auth/forgot-password', {
    method: 'POST',
    body: parsed.data,
  });
}

export async function resetPasswordAction(input: RecoveryValues) {
  const parsed = await parseSchema(recoveryResetSchema, input);
  if (!parsed.success) return parsed.error;
  const result = await apiFetch('auth/reset-password', {
    method: 'POST',
    body: parsed.data,
  });
  if (result.success) deleteSessionCookies(await cookies());
  return result;
}

export async function logoutAction(all = false) {
  const parsed = await parseSchema(z.boolean(), all);
  if (!parsed.success) return parsed.error;
  const cookieStore = await cookies();
  const session = getSessionCookies(cookieStore);
  if (session.refresh && !/^[a-f0-9]{64}$/.test(session.refresh)) {
    deleteSessionCookies(cookieStore);
    return apiFailure(401, 'UNAUTHENTICATED', await getLocale());
  }
  const result = await apiFetch(
    parsed.data ? 'auth/logout-all' : 'auth/logout',
    {
      method: 'POST',
      body: {},
      refreshToken: parsed.data ? undefined : session.refresh,
    },
  );
  if (result.success) deleteSessionCookies(cookieStore);
  return result;
}

export async function getCurrentUserAction(): Promise<ApiResult<AuthSession>> {
  const session = getSessionCookies(await cookies());
  if (!session.access && !session.refresh)
    return {
      success: true,
      status: 200,
      code: 'OK',
      message: 'OK',
      data: { user: null },
    };
  const result = await apiFetch<AuthUser>('auth/me');
  return {
    ...result,
    data: result.success && result.data ? { user: result.data } : undefined,
  };
}
