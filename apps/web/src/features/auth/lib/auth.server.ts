import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import { apiFetch, requestApi, type ApiOptions } from '@/shared/lib/api';
import {
  ApiError,
  apiFailure,
  isUnauthenticated,
  unwrapApiResult,
  type ApiResult,
} from '@/shared/lib/apiResult';
import type { AuthUser } from '../types/auth';

type Session = { access?: string; refresh?: string };
type ReadOptions = Pick<ApiOptions, 'locale' | 'requestHeaders' | 'signal'>;
export type AuthTokens = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
};
type SessionRead<T> = { result: ApiResult<T>; tokens?: AuthTokens | null };
type CookieTarget = { cookies: Pick<NextResponse['cookies'], 'set'> };
const production = process.env.NODE_ENV === 'production';
export const authCookies = {
  access: production ? '__Host-bus_access' : 'bus_web_access',
  refresh: production ? '__Host-bus_refresh' : 'bus_web_refresh',
};
const cookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: 'lax' as const,
  path: '/',
};
export function readAuthCookies(request: {
  cookies: { get(name: string): { value: string } | undefined };
}): Session {
  return {
    access: request.cookies.get(authCookies.access)?.value,
    refresh: request.cookies.get(authCookies.refresh)?.value,
  };
}
export function saveAuthCookies(target: CookieTarget, tokens: AuthTokens) {
  target.cookies.set(authCookies.access, tokens.accessToken, {
    ...cookieOptions,
    maxAge: tokens.expiresIn,
  });
  target.cookies.set(authCookies.refresh, tokens.refreshToken, {
    ...cookieOptions,
    expires: tokens.refreshExpiresAt,
  });
}
export function clearAuthCookies(target: CookieTarget) {
  for (const name of Object.values(authCookies))
    target.cookies.set(name, '', {
      ...cookieOptions,
      maxAge: 0,
      // Keep deletion explicit when Next forwards proxy cookies into an Action.
      expires: new Date(0),
    });
}
// Only Actions/Route Handlers call this. Proxy writes to its outgoing response.
export async function updateAuthCookies(tokens: AuthTokens | null | undefined) {
  if (tokens === undefined) return;
  const target = { cookies: await cookies() };
  if (tokens) saveAuthCookies(target, tokens);
  else clearAuthCookies(target);
}
const tokensSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
  }),
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive().max(3600),
});
export function sessionTokens(headers: Headers, result: ApiResult<unknown>) {
  const parsed = tokensSchema.safeParse(result.data);
  const cookie = headers
    .getSetCookie()
    .find((value) => /^(bus_refresh|__Secure-bus_refresh)=/.test(value));
  const refreshToken = cookie?.split(';')[0].split('=')[1];
  const expires = cookie?.match(/;\s*Expires=([^;]+)/i)?.[1];
  if (
    !parsed.success ||
    !refreshToken ||
    !/^[a-f0-9]{64}$/.test(refreshToken) ||
    !expires ||
    Number.isNaN(Date.parse(expires))
  )
    return null;
  return {
    user: parsed.data.user,
    tokens: {
      accessToken: parsed.data.accessToken,
      expiresIn: parsed.data.expiresIn,
      refreshToken,
      refreshExpiresAt: new Date(expires),
    },
  };
}

// Runtime-local deduplication; PostgreSQL coordinates rotation across API replicas.
const refreshes = new Map<string, Promise<SessionRead<AuthUser>>>();
async function refreshSession(
  token: string,
  options: ReadOptions,
): Promise<SessionRead<AuthUser>> {
  const locale = options.locale ?? (await getLocale());
  if (!/^[a-f0-9]{64}$/.test(token))
    return { result: apiFailure(401, 'UNAUTHENTICATED', locale), tokens: null };
  const running = refreshes.get(token);
  if (running) return running;
  const pending = (async (): Promise<SessionRead<AuthUser>> => {
    // A caller's AbortSignal must not cancel a shared rotation.
    const { result, headers } = await requestApi('auth/refresh', {
      method: 'POST',
      body: {},
      refreshToken: token,
      locale,
      requestHeaders: options.requestHeaders,
    });
    if (!result.success)
      return {
        result: { ...result, data: undefined },
        tokens: isUnauthenticated(result) ? null : undefined,
      };
    const session = sessionTokens(headers, result);
    return session
      ? { result: { ...result, data: session.user }, tokens: session.tokens }
      : { result: apiFailure(502, 'UPSTREAM_ERROR', locale) };
  })().finally(() => refreshes.delete(token));
  refreshes.set(token, pending);
  return pending;
}

// A GET can renew once. The caller owns writing cookies, including after a failed retry.
export async function readWithSession<T>(
  path: string,
  session: Session,
  { locale, signal, requestHeaders }: ReadOptions = {},
): Promise<SessionRead<T>> {
  const options = { locale, signal, requestHeaders };
  let result = await apiFetch<T>(path, {
    ...options,
    accessToken: session.access,
  });
  let tokens: AuthTokens | null | undefined;
  if (isUnauthenticated(result) && session.refresh) {
    const refreshed = await refreshSession(session.refresh, options);
    tokens = refreshed.tokens;
    if (!tokens)
      return { result: { ...refreshed.result, data: undefined }, tokens };
    result = await apiFetch<T>(path, {
      ...options,
      accessToken: tokens.accessToken,
    });
  }
  if (isUnauthenticated(result)) tokens = null;
  return { result, tokens };
}

// SSR is read-only. Proxy has already renewed cookies before this render.
export async function readApi<T>(path: string, options: ReadOptions = {}) {
  const session = readAuthCookies({ cookies: await cookies() });
  return apiFetch<T>(path, { ...options, accessToken: session.access });
}

// Authenticated Actions/Route Handlers: verify before writes, never replay a mutation.
export async function authenticatedFetch<T = unknown>(
  path: string,
  options: Omit<ApiOptions, 'accessToken' | 'refreshToken'> = {},
): Promise<ApiResult<T>> {
  const session = readAuthCookies({ cookies: await cookies() });
  if (!options.method || options.method === 'GET') {
    const read = await readWithSession<T>(path, session, options);
    await updateAuthCookies(read.tokens);
    return read.result;
  }
  const checked = await readWithSession<AuthUser>('auth/me', session, options);
  await updateAuthCookies(checked.tokens);
  if (!checked.result.success) return { ...checked.result, data: undefined };
  const result = await apiFetch<T>(path, {
    ...options,
    accessToken: checked.tokens?.accessToken ?? session.access,
  });
  if (isUnauthenticated(result)) await updateAuthCookies(null);
  return result;
}

// Request-local memoization; no cached identity is shared between users.
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  if (!readAuthCookies({ cookies: await cookies() }).access) return null;
  const result = await readApi<AuthUser>('auth/me');
  if (result.status === 401) return null;
  const { id, name, email, phone, role } = unwrapApiResult(result);
  return { id, name, email, phone, role };
});
export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED');
  return user;
}
