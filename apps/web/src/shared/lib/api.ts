import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { getSessionCookies } from './session';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import { apiFailure, type ApiResult } from './apiResult';
import { backendClientContext } from './clientIdentity';

// Shared options for all backend requests.
export type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  locale?: string;
  requestHeaders?: Headers; // Incoming browser request headers, used to read its IP.
  accessToken?: string | null; // null explicitly sends no access token.
  refreshToken?: string;
};

// Validate the response envelope; each feature defines its own data type.
const apiResponseSchema = z.object({
  success: z.boolean(),
  code: z.string().min(1),
  message: z.string().min(1),
  data: z.unknown().optional(),
  requestId: z.uuid().optional(),
});

// Send once using the current access cookie. Proxy owns session renewal.
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<ApiResult<T>> {
  const locale = options.locale ?? (await getLocale());

  try {
    // Proxy passes its token explicitly; pages and Actions read the current cookie.
    const accessToken =
      options.accessToken !== undefined
        ? options.accessToken
        : getSessionCookies(await cookies()).access;

    // 1. Build the backend URL and choose the HTTP method.
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) throw new Error('API_BASE_URL is required');
    const url = new URL(baseUrl.replace(/\/$/, '') + '/' + path);
    const method = options.method ?? 'GET';

    // 2. Set shared headers. Credentials are supplied by the server-side caller.
    const outgoingHeaders = new Headers(options.headers);
    for (const name of [
      'Authorization',
      'Cookie',
      'Host',
      'Origin',
      'X-Web-Client-IP',
      'X-Web-Client-Time',
      'X-Web-Client-Signature',
    ]) {
      outgoingHeaders.delete(name);
    }
    outgoingHeaders.set('Content-Type', 'application/json');
    outgoingHeaders.set('Accept-Language', locale);
    outgoingHeaders.set('X-CSRF-Protection', '1');
    if (process.env.SITE_ORIGIN) {
      outgoingHeaders.set('Origin', process.env.SITE_ORIGIN);
    }
    if (accessToken) {
      outgoingHeaders.set('Authorization', 'Bearer ' + accessToken);
    }
    if (options.refreshToken) {
      outgoingHeaders.set(
        'Cookie',
        `bus_refresh=${options.refreshToken}; __Secure-bus_refresh=${options.refreshToken}`,
      );
    }

    // 3. Add signed client IP headers when that feature is enabled.
    const clientHeaders = await backendClientContext(
      method,
      url,
      options.requestHeaders,
    );
    for (const [name, value] of Object.entries(clientHeaders)) {
      outgoingHeaders.set(name, value);
    }

    // 4. Keep a supplied string body, or serialize other defined values as JSON.
    const requestBody =
      typeof options.body === 'string' || options.body === undefined
        ? options.body
        : JSON.stringify(options.body);

    // 5. Send without caching or redirects; stop after 20 seconds or caller abort.
    const timeoutSignal = AbortSignal.timeout(20000);
    const response = await fetch(url, {
      method,
      headers: outgoingHeaders,
      body: requestBody,
      cache: 'no-store',
      redirect: 'error',
      signal: options.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal,
    });

    // 6. Require valid JSON matching our response envelope and HTTP status.
    const responseBody = await response.json().catch(() => null);
    const parsed = apiResponseSchema.safeParse(responseBody);
    if (!parsed.success || parsed.data.success !== response.ok) {
      return apiFailure(502, 'UPSTREAM_ERROR', locale);
    }

    // 7. Return the result with HTTP status and retry metadata.
    const { requestId, ...backendResult } = parsed.data;
    const result: ApiResult<T> = {
      ...backendResult,
      data: backendResult.data as T,
      status: response.status,
    };

    // Let the middleware recheck the session and role on a fresh page request.
    if (!path.startsWith('auth/')) {
      if (result.status === 401 && result.code === 'UNAUTHENTICATED') {
        const returnTo = (await headers()).get('x-bus-return-to');
        const pagePath =
          returnTo?.startsWith('/') && !returnTo.startsWith('//')
            ? returnTo
            : '/';
        redirect('/' + locale + pagePath);
      }
      if (result.status === 403) redirect('/' + locale + '/forbidden');
    }

    if (requestId && response.status >= 500) {
      result.requestId = requestId;
    }
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      result.retryAfter = retryAfter;
    }
    return result;
  } catch (error) {
    unstable_rethrow(error);
    // A failed response does not prove the operation failed. Never retry here.
    return apiFailure(502, 'UPSTREAM_UNAVAILABLE', locale);
  }
}
