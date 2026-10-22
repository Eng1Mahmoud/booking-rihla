import { ApiError } from '@/shared/lib/apiResult';

/** Fallback copy when the API only returns a code (no localized message). */
const codeMessages: Record<string, { ar: string; en: string }> = {
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
  NETWORK_ERROR: {
    ar: 'تعذر الاتصال. تحقق من الشبكة وحاول مجددًا.',
    en: 'Could not reach the server. Check your connection and try again.',
  },
  UNAUTHENTICATED: {
    ar: 'سجّل الدخول للمتابعة.',
    en: 'Sign in to continue.',
  },
};

export type ErrorCta = {
  href: string;
  labelAr: string;
  labelEn: string;
};

/** Suggested next step for passenger-facing errors. */
export function errorCta(code: string): ErrorCta | null {
  switch (code) {
    case 'TRIP_UNAVAILABLE':
    case 'TRIP_NOT_FOUND':
    case 'TRIP_CANCELLED':
    case 'TRIP_DEPARTED':
    case 'BOOKING_EXPIRED':
    case 'PAYMENT_WINDOW_TOO_SHORT':
      return {
        href: '/',
        labelAr: 'ابحث عن رحلة',
        labelEn: 'Find a trip',
      };
    case 'BOOKING_NOT_FOUND':
    case 'PAYMENT_UNAVAILABLE':
    case 'CHECKOUT_CLOSED':
    case 'PAYMENT_ATTEMPT_EXISTS':
    case 'BOOKING_NOT_PAYABLE':
      return {
        href: '/bookings',
        labelAr: 'حجوزاتي',
        labelEn: 'My bookings',
      };
    case 'UNAUTHENTICATED':
      return {
        href: '/login',
        labelAr: 'تسجيل الدخول',
        labelEn: 'Sign in',
      };
    default:
      return null;
  }
}

/** Prefer API message; otherwise known code copy; otherwise generic fallback. */
export function resolveErrorMessage(error: unknown, locale: string) {
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

export function errorCode(error: unknown) {
  return error instanceof ApiError ? error.code : '';
}
