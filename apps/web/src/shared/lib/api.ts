import 'server-only';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import {
  readAuthCookies,
  updateAuthCookies,
  sessionTokens,
  type AuthTokens,
  type SessionUser,
} from './session';
import type { ApiResult } from './apiResult';

type Session = { access?: string; refresh?: string };
type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: HeadersInit;
  signal?: AbortSignal;
  body?: unknown;
  // GETs rendered by Server Components are read-only. Actions can renew cookies.
  context?: 'action';
  locale?: string;
  session?: Session;
  // Handler/proxy supply their response writer; actions use the central cookie writer.
  onSession?: (tokens: AuthTokens | null) => void | Promise<void>;
};
const envelopeSchema = z.object({
  success: z.boolean(),
  code: z.string().min(1),
  message: z.string().min(1),
  data: z.unknown().optional(),
  requestId: z.uuid().optional(),
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
  if (session.access) headers.set('Authorization', 'Bearer ' + session.access);
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

type RefreshResult = {
  result: ApiResult<{ user: SessionUser }>;
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
  const method = options.method ?? 'GET';
  const login = method === 'POST' && endpoint === 'auth/login';
  const refreshing = method === 'POST' && endpoint === 'auth/refresh';
  const logout =
    method === 'POST' && ['auth/logout', 'auth/logout-all'].includes(endpoint);
  const reset = method === 'POST' && endpoint === 'auth/reset-password';
  const publicAuth =
    endpoint.startsWith('auth/') &&
    !['auth/me', 'auth/logout-all'].includes(endpoint);
  // Ordinary writes run inside actions. GET actions opt in; SSR GETs never write cookies.
  const onSession =
    options.onSession ??
    (method !== 'GET' || options.context === 'action'
      ? updateAuthCookies
      : undefined);
  try {
    // Always attach the current access token when present, including on public reads.
    let session =
      options.session ?? readAuthCookies({ cookies: await cookies() });
    const updateSession = async (tokens: AuthTokens | null) => {
      session = tokens
        ? { access: tokens.accessToken, refresh: tokens.refreshToken }
        : {};
      await onSession?.(tokens);
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
            result: failed<{ user: SessionUser }>(
              401,
              'UNAUTHENTICATED',
              locale,
            ),
          };
      if (refreshed.tokens) await updateSession(refreshed.tokens);
      else if (refreshed.result.status === 401) await updateSession(null);
      return refreshed.result as ApiResult<T>;
    }

    // No payment/write replay: authenticate using a GET before sending any protected mutation.
    if (!publicAuth && method !== 'GET' && onSession) {
      const checked = await apiFetch<SessionUser>('auth/me', {
        locale,
        session,
        signal: options.signal,
        onSession: updateSession,
      });
      if (!checked.success) return { ...checked, data: undefined };
    }
    let response = await send(path, { ...options, method }, locale, session);
    let result = await readResult<T>(response, locale);
    if (
      result.status === 401 &&
      result.code === 'UNAUTHENTICATED' &&
      method === 'GET' &&
      onSession &&
      session.refresh
    ) {
      const refreshed = await refreshSession(session.refresh, locale);
      if (!refreshed.tokens) {
        if (refreshed.result.status === 401) await updateSession(null);
        return { ...refreshed.result, data: undefined };
      }
      await updateSession(refreshed.tokens);
      response = await send(path, { ...options, method }, locale, session);
      result = await readResult<T>(response, locale);
    }
    if (login && result.success) {
      const loggedIn = sessionTokens(response, result);
      if (!loggedIn) return failed(502, 'UPSTREAM_ERROR', locale);
      await updateSession(loggedIn.tokens);
      return { ...result, data: { user: loggedIn.user } as T };
    }
    if (
      (!publicAuth &&
        result.status === 401 &&
        result.code === 'UNAUTHENTICATED') ||
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
