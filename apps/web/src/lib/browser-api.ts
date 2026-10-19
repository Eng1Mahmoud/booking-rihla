export class BrowserApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}
export async function browserRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
  let response: Response;
  try {
    response = await fetch(base.replace(/\/$/, '') + '/' + path, {
      ...options,
      cache: 'no-store',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Protection': '1',
        ...options.headers,
      },
      signal: options.signal ?? AbortSignal.timeout(15000),
    });
  } catch {
    throw new BrowserApiError(0, 'NETWORK_ERROR');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new BrowserApiError(
      response.status,
      payload?.error?.code ?? 'REQUEST_FAILED',
    );
  }
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}
const errors: Record<string, [string, string]> = {
  NETWORK_ERROR: [
    'تعذر الاتصال. تحقق من اتصالك ثم أعد المحاولة.',
    'Could not connect. Check your connection and try again.',
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
