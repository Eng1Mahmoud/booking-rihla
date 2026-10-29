'use server';
import { cookies } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { apiFetch } from '@/shared/lib/api';
import { apiFailure, type ApiResult } from '@/shared/lib';
import {
  deleteSessionCookies,
  getSessionCookies,
  setSessionCookies,
  tokensSchema,
} from '@/shared/lib/session';
import type { LoginValues } from '../schemas/loginSchema';
import type { AuthUser, UserRole } from '../types/auth';
export async function loginAction(
  input: LoginValues,
): Promise<ApiResult<{ role: UserRole }>> {
  const locale = await getLocale();
  const result = await apiFetch<unknown>('auth/login', {
    method: 'POST',
    body: input,
    accessToken: null,
  });
  if (!result.success) return { ...result, data: undefined };
  const tokens = tokensSchema.safeParse(result.data);
  if (!tokens.success) return apiFailure(502, 'UPSTREAM_ERROR', locale);
  const user = await apiFetch<AuthUser>('auth/me', {
    accessToken: tokens.data.accessToken,
  });
  if (!user.success) return { ...user, data: undefined };
  if (
    !user.data ||
    !['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(user.data.role)
  ) {
    await apiFetch('auth/logout', {
      method: 'POST',
      body: {},
      accessToken: tokens.data.accessToken,
      refreshToken: tokens.data.refreshToken,
    });
    const t = await getTranslations('Auth');
    return {
      success: false,
      status: 403,
      code: 'FORBIDDEN',
      message: t('staffOnly'),
    };
  }
  setSessionCookies(await cookies(), tokens.data);
  return { ...result, data: { role: user.data.role } };
}
export async function logoutAction(): Promise<ApiResult<void>> {
  const store = await cookies();
  const session = getSessionCookies(store);
  if (!session.access && !session.refresh)
    return { success: true, status: 200, code: 'OK', message: 'OK' };
  if (session.refresh && !/^[a-f0-9]{64}$/.test(session.refresh)) {
    deleteSessionCookies(store);
    return { success: true, status: 200, code: 'OK', message: 'OK' };
  }
  const result = await apiFetch('auth/logout', {
    method: 'POST',
    body: {},
    refreshToken: session.refresh,
  });
  if (result.success || result.status === 401) {
    deleteSessionCookies(store);
    return { success: true, status: 200, code: 'OK', message: 'OK' };
  }
  return { ...result, data: undefined };
}
