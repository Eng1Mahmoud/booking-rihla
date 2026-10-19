// Used by AuthSessionSync to clear the user and private query cache.
export const SESSION_EXPIRED_EVENT = 'bus:session-expired';
// One error shape for HTTP failures in both server and browser code.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
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
  return new ApiError(response.status, body?.error?.code ?? 'REQUEST_FAILED');
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
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}
// Display messages only; they do not control requests or session recovery.
const errors: Record<string, [string, string]> = {
  UPSTREAM_UNAVAILABLE: [
    'تعذر الاتصال بالخادم. حاول مجددًا.',
    'The server could not be reached. Please try again.',
  ],
  UPSTREAM_ERROR: [
    'تعذر معالجة رد الخادم. حاول مجددًا.',
    'The server response could not be processed. Try again.',
  ],
  FORBIDDEN: [
    'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
    'You do not have permission to perform this action.',
  ],
  NETWORK_ERROR: [
    'تعذر الاتصال. تحقق من اتصالك ثم أعد المحاولة.',
    'Could not connect. Check your connection and try again.',
  ],
  INVALID_RESET_CODE: [
    'رمز الاستعادة غير صحيح أو انتهت صلاحيته. اطلب رمزًا جديدًا عند الحاجة.',
    'The recovery code is invalid or expired. Request a new code if needed.',
  ],
  INVALID_CREDENTIALS: [
    'تعذر تسجيل الدخول. راجع البريد وكلمة المرور وتأكد من تفعيل البريد.',
    'Could not sign in. Check your credentials and verify your email.',
  ],
  UNAUTHENTICATED: ['سجل الدخول للمتابعة.', 'Sign in to continue.'],
  VALIDATION_ERROR: [
    'راجع البيانات المدخلة وحاول مرة أخرى.',
    'Check your details and try again.',
  ],
  INVALID_VERIFICATION_CODE: [
    'الرمز غير صحيح أو انتهت صلاحيته.',
    'The code is incorrect or has expired.',
  ],
  VERIFICATION_FAILED: [
    'الرمز غير صحيح أو انتهت صلاحيته.',
    'The code is incorrect or has expired.',
  ],
  RATE_LIMITED: [
    'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
    'Too many attempts. Please wait before trying again.',
  ],
  SEAT_UNAVAILABLE: [
    'حجز شخص آخر أحد المقاعد. اختر مقعدًا متاحًا.',
    'Someone else reserved a selected seat. Choose an available seat.',
  ],
  TRIP_UNAVAILABLE: [
    'هذه الرحلة لم تعد متاحة للحجز.',
    'This trip is no longer available for booking.',
  ],
  BOOKING_EXPIRED: [
    'انتهت مهلة الحجز. اختر المقاعد من جديد.',
    'The reservation expired. Choose your seats again.',
  ],
  PAYMENT_UNAVAILABLE: [
    'الدفع الإلكتروني غير متاح حاليًا. راجع حالة الدفع المسجلة في صفحة الحجز.',
    'Online payment is currently unavailable. Check the recorded payment status in your booking.',
  ],
  CSRF_REJECTED: [
    'افتح الموقع عبر localhost:3000 ثم حاول مرة أخرى.',
    'Open the website using localhost:3000 and try again.',
  ],
};
export function errorMessage(error: unknown, locale: string) {
  const pair = error instanceof ApiError ? errors[error.code] : undefined;
  return (
    pair?.[locale === 'ar' ? 0 : 1] ??
    (locale === 'ar'
      ? 'تعذر إكمال الطلب. حاول مرة أخرى.'
      : 'Could not complete the request. Please try again.')
  );
}

// Feature API files use these methods; request() handles their shared behavior.
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
