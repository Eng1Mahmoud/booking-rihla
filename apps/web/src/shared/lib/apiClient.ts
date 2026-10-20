import { ApiError } from './apiResult';
export { ApiError, errorMessage, isUncertainRequestError } from './apiResult';

// The server reports an ended session; this event clears the client query cache.
export const SESSION_EXPIRED_EVENT = 'bus:session-expired';

// Browser requests only. Cookie handling and refresh now happen on the Next server.
async function request<T>(
  path: string,
  options: RequestInit = {},
  body?: unknown,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-CSRF-Protection', '1');
  headers.set(
    'Accept-Language',
    window.location.pathname.startsWith('/ar') ? 'ar' : 'en',
  );
  let response: Response;
  try {
    response = await fetch('/api/backend/' + path, {
      ...options,
      headers,
      cache: 'no-store',
      credentials: 'same-origin',
      body: body === undefined ? options.body : JSON.stringify(body),
      signal: options.signal ?? AbortSignal.timeout(25000),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR');
  }
  const result = await response.json().catch(() => null);
  if (!result || typeof result.success !== 'boolean')
    throw new ApiError(502, 'UPSTREAM_ERROR');
  if (!response.ok) {
    if (response.status === 401 && result?.code === 'UNAUTHENTICATED') {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(
      response.status,
      result?.code ?? 'REQUEST_FAILED',
      result?.message,
      result?.requestId,
    );
  }
  // Keep current list components working until their Server Component migration.
  if (result?.success && Array.isArray(result.data?.items)) {
    return {
      ...result,
      data: result.data.items,
      pagination: result.data.pagination,
    } as T;
  }
  return result as T;
}

export const apiClient = {
  get: <T>(path: string, options: RequestInit = {}) =>
    request<T>(path, options),
  post: <T>(path: string, body: unknown = {}, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'POST' }, body),
  patch: <T>(path: string, body: unknown, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'PATCH' }, body),
  put: <T>(path: string, body: unknown, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'PUT' }, body),
  delete: <T>(path: string, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
