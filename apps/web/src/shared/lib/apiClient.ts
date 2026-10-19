export const SESSION_EXPIRED_EVENT = 'bus:session-expired';
export class BrowserApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}
export function isUncertainRequestError(error: unknown) {
  return (
    error instanceof BrowserApiError &&
    (error.code === 'NETWORK_ERROR' || error.status >= 500)
  );
}
async function fetchBrowser(path: string, options: RequestInit = {}) {
  try {
    return await fetch('/api/backend/' + path, {
      ...options,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'X-CSRF-Protection': '1',
      },
      signal: options.signal ?? AbortSignal.timeout(25000),
    });
  } catch {
    throw new BrowserApiError(0, 'NETWORK_ERROR');
  }
}
async function withSessionLock(action: () => Promise<void>) {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    await navigator.locks.request('bus-auth-refresh', async () => {
      await action();
    });
  } else {
    await action();
  }
}
async function send(path: string, options: RequestInit = {}) {
  if (!['auth/login', 'auth/logout', 'auth/logout-all'].includes(path))
    return fetchBrowser(path, options);
  let response!: Response;
  // A concurrent refresh must finish before login/logout can replace the shared cookies.
  await withSessionLock(async () => {
    response = await fetchBrowser(path, options);
  });
  return response;
}
async function failure(response: Response) {
  const body = await response.json().catch(() => null);
  return new BrowserApiError(
    response.status,
    body?.error?.code ?? 'REQUEST_FAILED',
  );
}
function expired() {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
let refreshInFlight: Promise<void> | null = null;
async function recoverSession() {
  if (refreshInFlight) return refreshInFlight;
  const recover = async () => {
    // Another tab may have refreshed while we waited for the browser-wide lock.
    const current = await send('auth/me');
    if (current.ok) return;
    if (current.status !== 401) throw await failure(current);
    const response = await send('auth/refresh', { method: 'POST', body: '{}' });
    if (!response.ok) {
      if (response.status === 401) expired();
      throw await failure(response);
    }
  };
  refreshInFlight = withSessionLock(recover).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}
async function browserRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response = await send(path, options);
  const endpoint = path.split('?')[0].toLowerCase();
  // Credential/code failures are not expired-session failures.
  const canRefresh =
    !endpoint.startsWith('auth/') ||
    endpoint === 'auth/me' ||
    endpoint === 'auth/logout-all';
  // Only authentication rejection permits a replay: no retries for 403, network failures or unknown payment outcomes.
  if (response.status === 401 && canRefresh) {
    await recoverSession();
    response = await send(path, options);
    if (response.status === 401) expired();
  }
  if (!response.ok) throw await failure(response);
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}
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
  const pair =
    error instanceof BrowserApiError ? errors[error.code] : undefined;
  return (
    pair?.[locale === 'ar' ? 0 : 1] ??
    (locale === 'ar'
      ? 'تعذر إكمال الطلب. حاول مرة أخرى.'
      : 'Could not complete the request. Please try again.')
  );
}

export const apiClient = {
  get: <T>(path: string, options: RequestInit = {}) =>
    browserRequest<T>(path, options),
  post: <T>(path: string, body: unknown = {}, options: RequestInit = {}) =>
    browserRequest<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown, options: RequestInit = {}) =>
    browserRequest<T>(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown, options: RequestInit = {}) =>
    browserRequest<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string, options: RequestInit = {}) =>
    browserRequest<T>(path, { ...options, method: 'DELETE' }),
};
