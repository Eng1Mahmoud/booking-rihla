import 'server-only';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import { readAuthCookies, type AuthTokens } from './authCookies';
import type { ApiResult } from './apiResult';
import type { AuthUser } from '@/features/auth/types/auth';

type Session = { access?: string; refresh?: string };
type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
  locale?: string;
  session?: Session;
  // Only actions/handlers/proxy provide a writer; Server Components only read.
  onSession?: (tokens: AuthTokens | null) => void | Promise<void>;
};
const envelopeSchema = z.object({
  success: z.boolean(),
  code: z.string().min(1),
  message: z.string().min(1),
  data: z.unknown().optional(),
  requestId: z.uuid().optional(),
});
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

function failed<T>(status: number, code: string, locale: string): ApiResult<T> {
  const message =
    status === 401
      ? locale.startsWith('ar')
        ? 'سجّل الدخول للمتابعة.'
        : 'Sign in to continue.'
      : locale.startsWith('ar')
        ? 'تعذر إكمال الطلب. حاول مجددًا.'
        : 'Could not complete the request. Please try again.';
  return { success: false, status, code, message };
}

// This is the only Next-to-Express HTTP transport. Browser headers are never forwarded wholesale.
function send(
  path: string,
  options: ApiOptions,
  locale: string,
  session: Session,
) {
  const base = process.env.API_BASE_URL;
  if (!base) throw new Error('API_BASE_URL is required');
  const endpoint = path.split('?')[0].toLowerCase();
  const headers = new Headers(options.headers);
  for (const name of ['Authorization', 'Cookie', 'Host', 'Origin'])
    headers.delete(name);
  headers.set('Content-Type', 'application/json');
  headers.set('X-CSRF-Protection', '1');
  headers.set('Accept-Language', locale);
  if (process.env.SITE_ORIGIN) headers.set('Origin', process.env.SITE_ORIGIN);
  if (session.access && endpoint !== 'auth/refresh')
    headers.set('Authorization', 'Bearer ' + session.access);
  if (
    session.refresh &&
    ['auth/refresh', 'auth/logout', 'auth/logout-all'].includes(endpoint)
  ) {
    headers.set(
      'Cookie',
      'bus_refresh=' +
        session.refresh +
        '; __Secure-bus_refresh=' +
        session.refresh,
    );
  }
  return fetch(base.replace(/\/$/, '') + '/' + path, {
    method: options.method ?? 'GET',
    headers,
    body:
      typeof options.body === 'string'
        ? options.body
        : options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
    cache: 'no-store',
    redirect: 'error',
    signal: options.signal ?? AbortSignal.timeout(20000),
  });
}

async function readResult<T>(
  response: Response,
  locale: string,
): Promise<ApiResult<T>> {
  const parsed = envelopeSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success || parsed.data.success !== response.ok)
    return failed(502, 'UPSTREAM_ERROR', locale);
  const { requestId, ...body } = parsed.data;
  return {
    ...body,
    data: body.data as T,
    status: response.status,
    ...(requestId && response.status >= 500 ? { requestId } : {}),
    ...(response.headers.get('retry-after')
      ? { retryAfter: response.headers.get('retry-after')! }
      : {}),
  };
}

// Extract backend tokens here only. ApiResult never contains access or refresh credentials.
function sessionTokens(response: Response, result: ApiResult<unknown>) {
  const parsed = tokensSchema.safeParse(result.data);
  const cookie = response.headers
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

type RefreshResult = {
  result: ApiResult<{ user: AuthUser }>;
  tokens?: AuthTokens;
};
// Single-flight per old token, in this server runtime only. No grace window or replay cache.
const refreshes = new Map<string, Promise<RefreshResult>>();
function refreshSession(token: string, locale: string): Promise<RefreshResult> {
  if (!/^[a-f0-9]{64}$/.test(token))
    return Promise.resolve({ result: failed(401, 'UNAUTHENTICATED', locale) });
  const running = refreshes.get(token);
  if (running) return running;
  const pending = (async (): Promise<RefreshResult> => {
    try {
      // Independent timeout: one caller cancelling must not cancel another caller's refresh.
      const response = await send(
        'auth/refresh',
        { method: 'POST', body: {} },
        locale,
        { refresh: token },
      );
      const result = await readResult<unknown>(response, locale);
      if (!result.success) return { result: { ...result, data: undefined } };
      const session = sessionTokens(response, result);
      if (!session) return { result: failed(502, 'UPSTREAM_ERROR', locale) };
      return {
        result: { ...result, data: { user: session.user } },
        tokens: session.tokens,
      };
    } catch {
      return { result: failed(502, 'UPSTREAM_UNAVAILABLE', locale) };
    }
  })().finally(() => refreshes.delete(token));
  refreshes.set(token, pending);
  return pending;
}

// Reads return ApiResult. Authenticated mutations verify/renew first and are sent once.
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<ApiResult<T>> {
  const locale = options.locale ?? (await getLocale());
  if (!/^[a-zA-Z0-9-]+(?:\/[a-zA-Z0-9-]+)*$/.test(path.split('?')[0]))
    return failed(404, 'NOT_FOUND', locale);
  const endpoint = path.split('?')[0].toLowerCase();
  const method = (options.method ?? 'GET').toUpperCase();
  const login = method === 'POST' && endpoint === 'auth/login';
  const refreshing = method === 'POST' && endpoint === 'auth/refresh';
  const logout =
    method === 'POST' && ['auth/logout', 'auth/logout-all'].includes(endpoint);
  const reset = method === 'POST' && endpoint === 'auth/reset-password';
  const publicAuth =
    endpoint.startsWith('auth/') &&
    !['auth/me', 'auth/logout-all'].includes(endpoint);
  const auth = options.auth !== false && !publicAuth;
  if ((login || refreshing || logout || reset) && !options.onSession)
    return failed(500, 'SESSION_WRITE_REQUIRED', locale);
  try {
    let session =
      options.session ??
      (auth || refreshing || logout
        ? readAuthCookies({ cookies: await cookies() })
        : {});
    const updateSession = async (tokens: AuthTokens | null) => {
      session = tokens
        ? { access: tokens.accessToken, refresh: tokens.refreshToken }
        : {};
      await options.onSession?.(tokens);
    };
    if (
      (refreshing || logout) &&
      session.refresh &&
      !/^[a-f0-9]{64}$/.test(session.refresh)
    ) {
      await updateSession(null);
      return failed(401, 'UNAUTHENTICATED', locale);
    }
    if (refreshing) {
      const refreshed = session.refresh
        ? await refreshSession(session.refresh, locale)
        : {
            result: failed<{ user: AuthUser }>(401, 'UNAUTHENTICATED', locale),
          };
      if (refreshed.tokens) await updateSession(refreshed.tokens);
      else if (refreshed.result.status === 401) await updateSession(null);
      return refreshed.result as ApiResult<T>;
    }

    // No payment/write replay: authenticate using a GET before sending any protected mutation.
    if (auth && method !== 'GET' && options.onSession) {
      const checked = await apiFetch<AuthUser>('auth/me', {
        locale,
        session,
        signal: options.signal,
        onSession: updateSession,
      });
      if (!checked.success) return { ...checked, data: undefined };
    }
    let response = await send(
      path,
      { ...options, method },
      locale,
      auth || logout ? session : {},
    );
    if (
      response.status === 401 &&
      auth &&
      method === 'GET' &&
      options.onSession &&
      session.refresh
    ) {
      const refreshed = await refreshSession(session.refresh, locale);
      if (!refreshed.tokens) {
        if (refreshed.result.status === 401) await updateSession(null);
        return { ...refreshed.result, data: undefined };
      }
      await updateSession(refreshed.tokens);
      response = await send(path, { ...options, method }, locale, session);
    }
    const result = await readResult<T>(response, locale);
    if (login && result.success) {
      const loggedIn = sessionTokens(response, result);
      if (!loggedIn) return failed(502, 'UPSTREAM_ERROR', locale);
      await updateSession(loggedIn.tokens);
      return { ...result, data: { user: loggedIn.user } as T };
    }
    if (
      (auth && result.status === 401) ||
      (logout && result.success) ||
      (reset && result.success)
    )
      await updateSession(null);
    return result;
  } catch {
    // Do not retry uncertain network/payment outcomes or clear a session on a transient failure.
    return failed(502, 'UPSTREAM_UNAVAILABLE', locale);
  }
}
