import 'server-only';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import { apiFailure, type ApiResult } from './apiResult';
import { backendClientContext } from './clientIdentity';

export type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  locale?: string;
  requestHeaders?: Headers;
  accessToken?: string;
  refreshToken?: string;
};
const envelopeSchema = z.object({
  success: z.boolean(),
  code: z.string().min(1),
  message: z.string().min(1),
  data: z.unknown().optional(),
  requestId: z.uuid().optional(),
});

// The only HTTP transport. Credentials are supplied by the server-side caller.
// Raw response headers stay on the server; Actions return only result.
export async function requestApi<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<{ result: ApiResult<T>; headers: Headers }> {
  const locale = options.locale ?? (await getLocale());
  const failure = (status: number, code: string) => ({
    result: apiFailure<T>(status, code, locale),
    headers: new Headers(),
  });

  try {
    const base = process.env.API_BASE_URL;
    if (!base) throw new Error('API_BASE_URL is required');
    const url = new URL(base.replace(/\/$/, '') + '/' + path);
    const method = options.method ?? 'GET';
    const headers = new Headers(options.headers);
    for (const name of [
      'Authorization',
      'Cookie',
      'Host',
      'Origin',
      'X-Web-Client-IP',
      'X-Web-Client-Time',
      'X-Web-Client-Signature',
    ])
      headers.delete(name);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept-Language', locale);
    headers.set('X-CSRF-Protection', '1');
    if (process.env.SITE_ORIGIN) headers.set('Origin', process.env.SITE_ORIGIN);
    if (options.accessToken)
      headers.set('Authorization', 'Bearer ' + options.accessToken);
    if (options.refreshToken)
      headers.set(
        'Cookie',
        `bus_refresh=${options.refreshToken}; __Secure-bus_refresh=${options.refreshToken}`,
      );
    const identity = await backendClientContext(
      method,
      url,
      options.requestHeaders,
    );
    for (const [name, value] of Object.entries(identity))
      headers.set(name, value);
    const deadline = AbortSignal.timeout(20000);
    const response = await fetch(url, {
      method,
      headers,
      body:
        typeof options.body === 'string'
          ? options.body
          : options.body === undefined
            ? undefined
            : JSON.stringify(options.body),
      cache: 'no-store',
      redirect: 'error',
      signal: options.signal
        ? AbortSignal.any([options.signal, deadline])
        : deadline,
    });
    const parsed = envelopeSchema.safeParse(
      await response.json().catch(() => null),
    );
    if (!parsed.success || parsed.data.success !== response.ok)
      return failure(502, 'UPSTREAM_ERROR');
    const { requestId, ...body } = parsed.data;
    return {
      headers: response.headers,
      result: {
        ...body,
        data: body.data as T,
        status: response.status,
        ...(requestId && response.status >= 500 ? { requestId } : {}),
        ...(response.headers.get('retry-after')
          ? { retryAfter: response.headers.get('retry-after')! }
          : {}),
      },
    };
  } catch {
    // An uncertain request is never retried here.
    return failure(502, 'UPSTREAM_UNAVAILABLE');
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
) {
  return (await requestApi<T>(path, options)).result;
}
