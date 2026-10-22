'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { apiFetch, requestApi } from '@/shared/lib/api';
import { apiFailure, type ApiResult } from '@/shared/lib/apiResult';
import { parseSchema } from '@/shared/lib/parseSchema';
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
import {
  readAuthCookies,
  sessionTokens,
  updateAuthCookies,
  authenticatedFetch,
} from '../lib/auth.server';
import type {
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
} from '../types/auth';

// Public auth operations still validate on the server, independently of the form.
async function submit<T>(
  path: string,
  input: unknown,
  schema: z.ZodType,
): Promise<ApiResult<T>> {
  const parsed = await parseSchema(schema, input);
  if (!parsed.success) return parsed.error;
  return apiFetch<T>(path, { method: 'POST', body: parsed.data });
}

export async function loginAction(
  input: LoginInput,
): Promise<ApiResult<{ user: AuthUser }>> {
  const parsed = await parseSchema(loginSchema, input);
  if (!parsed.success) return parsed.error;
  const { result, headers } = await requestApi('auth/login', {
    method: 'POST',
    body: parsed.data,
  });
  if (!result.success) return { ...result, data: undefined };
  const session = sessionTokens(headers, result);
  if (!session) return apiFailure(502, 'UPSTREAM_ERROR', await getLocale());
  await updateAuthCookies(session.tokens);
  return { ...result, data: { user: session.user } };
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
  const result = await submit(
    'auth/reset-password',
    input,
    recoveryResetSchema,
  );
  if (result.success) await updateAuthCookies(null);
  return result;
}

export async function logoutAction(all = false) {
  const parsed = await parseSchema(z.boolean(), all);
  if (!parsed.success) return parsed.error;
  const session = readAuthCookies({ cookies: await cookies() });
  if (session.refresh && !/^[a-f0-9]{64}$/.test(session.refresh)) {
    await updateAuthCookies(null);
    return apiFailure(401, 'UNAUTHENTICATED', await getLocale());
  }
  const result = parsed.data
    ? await authenticatedFetch('auth/logout-all', { method: 'POST', body: {} })
    : await apiFetch('auth/logout', {
        method: 'POST',
        body: {},
        refreshToken: session.refresh,
      });
  if (result.success) await updateAuthCookies(null);
  return result;
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
  const result = await authenticatedFetch<AuthUser>('auth/me');
  return {
    ...result,
    data: result.success && result.data ? { user: result.data } : undefined,
  };
}
