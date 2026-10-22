import { ApiError, errorMessage } from '@/shared/lib/apiResult';

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

export function resolveErrorMessage(error: unknown, locale: string) {
  return errorMessage(error, locale);
}

export function errorCode(error: unknown) {
  return error instanceof ApiError ? error.code : '';
}
