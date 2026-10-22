// HTTP status supports action error handling; Route Handlers omit status/retryAfter from JSON.
export type ApiResult<T = unknown> = {
  success: boolean;
  code: string;
  message: string;
  data?: T;
  requestId?: string;
  status: number;
  retryAfter?: string;
};

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

/** Fallback when API returns code only (no localized message body). */
const codeMessages: Record<string, { ar: string; en: string }> = {
  VALIDATION_ERROR: {
    ar: 'راجع البيانات المدخلة وحاول مجددًا.',
    en: 'Check your details and try again.',
  },
  SEAT_UNAVAILABLE: {
    ar: 'أحد المقاعد لم يعد متاحًا. اختر مقعدًا آخر ثم أعد المحاولة.',
    en: 'A selected seat is no longer available. Choose another seat and try again.',
  },
  INVALID_SEATS: {
    ar: 'اختيار المقاعد غير صالح لهذه الرحلة.',
    en: 'The selected seats are not valid for this trip.',
  },
  BOOKING_SEATS_UNAVAILABLE: {
    ar: 'بعض مقاعد الحجز لم تعد متاحة.',
    en: 'Some seats on this booking are no longer available.',
  },
  TRIP_UNAVAILABLE: {
    ar: 'هذه الرحلة غير متاحة للحجز حاليًا.',
    en: 'This trip is not available for booking right now.',
  },
  TRIP_NOT_FOUND: {
    ar: 'الرحلة غير موجودة.',
    en: 'This trip could not be found.',
  },
  TRIP_CANCELLED: {
    ar: 'تم إلغاء هذه الرحلة.',
    en: 'This trip was cancelled.',
  },
  TRIP_DEPARTED: {
    ar: 'هذه الرحلة غادرت بالفعل.',
    en: 'This trip has already departed.',
  },
  BOOKING_EXPIRED: {
    ar: 'انتهت مهلة الحجز. ابحث عن رحلة واختر مقاعد متاحة.',
    en: 'The booking hold has expired. Search again and choose available seats.',
  },
  BOOKING_NOT_FOUND: {
    ar: 'الحجز غير موجود.',
    en: 'This booking could not be found.',
  },
  BOOKING_NOT_PAYABLE: {
    ar: 'لا يمكن دفع هذا الحجز في حالته الحالية.',
    en: 'This booking cannot be paid in its current state.',
  },
  PAYMENT_UNAVAILABLE: {
    ar: 'الدفع الإلكتروني غير متاح حاليًا. راجع حالة حجزك قبل المحاولة مجددًا.',
    en: 'Online payment is unavailable right now. Check your booking status before trying again.',
  },
  PAYMENT_WINDOW_TOO_SHORT: {
    ar: 'الوقت المتبقي غير كافٍ لبدء الدفع.',
    en: 'Not enough time remains to start payment.',
  },
  PAYMENT_NOT_REQUIRED: {
    ar: 'هذا الحجز لا يحتاج إلى دفع جديد.',
    en: 'This booking does not need a new payment.',
  },
  CHECKOUT_CLOSED: {
    ar: 'الدفع لهذا الحجز مغلق حاليًا. راجع حالة الحجز.',
    en: 'Checkout is closed for this booking. Check its payment status.',
  },
  PAYMENT_ATTEMPT_EXISTS: {
    ar: 'توجد محاولة دفع بالفعل. راجع حالة الحجز قبل البدء من جديد.',
    en: 'A payment attempt already exists. Check booking status before starting again.',
  },
  RATE_LIMITED: {
    ar: 'محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.',
    en: 'Too many attempts. Wait a moment and try again.',
  },
  SERVER_ACTION_FAILED: {
    ar: 'تعذر تنفيذ الطلب على الخادم. أعد تحميل الصفحة وحاول مجددًا.',
    en: 'The server could not complete the request. Reload the page and try again.',
  },
  NETWORK_ERROR: {
    ar: 'تعذر الاتصال. تحقق من الشبكة وحاول مجددًا.',
    en: 'Could not reach the server. Check your connection and try again.',
  },
  UNAUTHENTICATED: {
    ar: 'سجّل الدخول للمتابعة.',
    en: 'Sign in to continue.',
  },
};

// Prefer API message; then known code; then generic fallback.
export function errorMessage(error: unknown, locale: string) {
  const ar = locale.startsWith('ar');
  const fallback = ar
    ? 'تعذر إكمال الطلب. حاول مجددًا.'
    : 'Could not complete the request. Please try again.';
  if (!(error instanceof ApiError)) return fallback;
  if (error.message && error.message !== error.code) {
    return error.requestId
      ? error.message + ' (' + error.requestId + ')'
      : error.message;
  }
  const known = codeMessages[error.code];
  if (known) return ar ? known.ar : known.en;
  return fallback;
}

const findTripLink = {
  href: '/',
  labelAr: 'ابحث عن رحلة',
  labelEn: 'Find a trip',
};
const myBookingsLink = {
  href: '/bookings',
  labelAr: 'حجوزاتي',
  labelEn: 'My bookings',
};

// The UI selects a suggested link directly by error code.
export const errorLinks = new Map<
  string,
  { href: string; labelAr: string; labelEn: string }
>([
  ['TRIP_UNAVAILABLE', findTripLink],
  ['TRIP_NOT_FOUND', findTripLink],
  ['TRIP_CANCELLED', findTripLink],
  ['TRIP_DEPARTED', findTripLink],
  ['BOOKING_EXPIRED', findTripLink],
  ['PAYMENT_WINDOW_TOO_SHORT', findTripLink],
  ['BOOKING_NOT_FOUND', myBookingsLink],
  ['PAYMENT_UNAVAILABLE', myBookingsLink],
  ['CHECKOUT_CLOSED', myBookingsLink],
  ['PAYMENT_ATTEMPT_EXISTS', myBookingsLink],
  ['BOOKING_NOT_PAYABLE', myBookingsLink],
  [
    'UNAUTHENTICATED',
    {
      href: '/login',
      labelAr: 'تسجيل الدخول',
      labelEn: 'Sign in',
    },
  ],
]);

// Server reads and client action adapters use the same error shape.
export function unwrapApiResult<T>(result: ApiResult<T>): T {
  if (!result.success) {
    throw new ApiError(
      result.status,
      result.code,
      result.message,
      result.requestId,
    );
  }
  return result.data as T;
}

export function isUnauthenticated(error: { status: number; code: string }) {
  return error.status === 401 && error.code === 'UNAUTHENTICATED';
}

// Adapt action results for forms/React Query; a lost response has an uncertain outcome.
export async function invokeAction<T>(
  action: () => Promise<ApiResult<T>>,
): Promise<T> {
  let result: ApiResult<T>;
  try {
    result = await action();
  } catch (error) {
    // Next attaches a digest to server exceptions; they are not connectivity failures.
    if (error instanceof Error && 'digest' in error)
      throw new ApiError(500, 'SERVER_ACTION_FAILED');
    throw new ApiError(0, 'NETWORK_ERROR');
  }
  return unwrapApiResult(result);
}

// One builder for local validation, authentication and transport failures.
export function apiFailure<T = never>(
  status: number,
  code: string,
  locale: string,
): ApiResult<T> {
  return {
    success: false,
    status,
    code,
    message: errorMessage(new ApiError(status, code), locale),
  };
}
