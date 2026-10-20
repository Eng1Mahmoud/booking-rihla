// Used by AuthSessionSync to clear the user and private query cache.
export const SESSION_EXPIRED_EVENT = 'bus:session-expired';
// One error shape for HTTP failures in both server and browser code.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message = code,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}
export function isUncertainRequestError(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.code === 'NETWORK_ERROR' || error.status >= 500)
  );
}
// Raw responses are used by the gateway and page middleware.
export function fetchBackend(path: string, options: RequestInit = {}) {
  if (typeof window !== 'undefined')
    throw new Error('Direct backend requests run only on the server');
  const base = process.env.API_BASE_URL;
  if (!base) throw new Error('API_BASE_URL is required');
  const url = base.replace(/\/$/, '') + '/' + path;

  return fetch(url, {
    ...options,
    cache: 'no-store', // Always request fresh data.
    redirect: 'error', // Do not follow backend redirects.
    // Use the caller's cancellation signal, or a 20-second timeout.
    signal: options.signal ?? AbortSignal.timeout(20000),
  });
}

// Coordinate refresh/login/logout across browser tabs.
async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('bus-auth-refresh', action);
  }
  return action();
}

// One sender: direct backend calls on the server, gateway calls in the browser.
async function send(path: string, options: RequestInit = {}) {
  const perform = () => {
    if (typeof window === 'undefined') return fetchBackend(path, options);
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('X-CSRF-Protection', '1');
    headers.set(
      'Accept-Language',
      window.location.pathname.startsWith('/ar') ? 'ar' : 'en',
    );
    return fetch('/api/backend/' + path, {
      ...options,
      headers,
      cache: 'no-store',
      credentials: 'same-origin',
      signal: options.signal ?? AbortSignal.timeout(25000),
    });
  };
  try {
    if (
      typeof window !== 'undefined' &&
      ['auth/login', 'auth/logout', 'auth/logout-all'].includes(path)
    ) {
      return await withSessionLock(perform);
    }
    return await perform();
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR');
  }
}

async function failure(response: Response) {
  const body = await response.json().catch(() => null);
  return new ApiError(
    response.status,
    body?.code ?? body?.error?.code ?? 'REQUEST_FAILED',
    body?.message ?? body?.error?.message,
    body?.requestId,
  );
}
// All failed requests in this tab wait for the same refresh.
let refreshInFlight: Promise<void> | null = null;
function recoverSession() {
  refreshInFlight ??= withSessionLock(async () => {
    // Another tab may already have refreshed while this one waited.
    let response = await send('auth/me');
    if (response.ok) return;
    if (response.status === 401) {
      response = await send('auth/refresh', { method: 'POST', body: '{}' });
      if (response.status === 401)
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    if (!response.ok) throw await failure(response);
  }).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// Parse JSON and retry once only when an expired browser session causes a 401.
async function request<T>(
  path: string,
  options: RequestInit = {},
  body?: unknown,
): Promise<T> {
  if (body !== undefined) options = { ...options, body: JSON.stringify(body) };
  let response = await send(path, options);
  const endpoint = path.split('?')[0].toLowerCase();
  // Credential/code failures are not expired-session failures.
  const canRefresh =
    !endpoint.startsWith('auth/') ||
    endpoint === 'auth/me' ||
    endpoint === 'auth/logout-all';
  // Only authentication rejection permits a replay: no retries for 403, network failures or unknown payment outcomes.
  if (typeof window !== 'undefined' && response.status === 401 && canRefresh) {
    await recoverSession();
    response = await send(path, options);
    if (response.status === 401)
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (!response.ok) throw await failure(response);
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  // Keep existing list components working until their migration phase.
  if (result.success && Array.isArray(result.data?.items))
    return {
      ...result,
      data: result.data.items,
      pagination: result.data.pagination,
    } as T;
  return result as T;
}
// Backend messages are localized; only unavailable transport needs a fallback.
export function errorMessage(error: unknown, locale: string) {
  const fallback =
    locale === 'ar'
      ? 'تعذر إكمال الطلب. حاول مجددًا.'
      : 'Could not complete the request. Please try again.';
  if (!(error instanceof ApiError) || error.message === error.code)
    return fallback;
  return error.requestId
    ? error.message + ' (' + error.requestId + ')'
    : error.message;
}

// Feature API files use these methods; request() handles their shared behavior.
export const apiClient = {
  get: <T,>(path: string, options: RequestInit = {}) =>
    request<T>(path, options),
  post: <T,>(path: string, body: unknown = {}, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'POST' }, body),
  patch: <T,>(path: string, body: unknown, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'PATCH' }, body),
  put: <T,>(path: string, body: unknown, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'PUT' }, body),
  delete: <T,>(path: string, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
