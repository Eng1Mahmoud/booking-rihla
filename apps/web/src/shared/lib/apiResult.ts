import { unstable_rethrow } from 'next/navigation';

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

// Locale comes from the current server request or client component.
// Prefer the API message; use one generic fallback when no message is available.
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
  return fallback;
}

// Server reads and client action adapters use the same error shape.
export function getApiDataOrThrow<T>(result: ApiResult<T>): T {
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

// Adapt action results for forms/React Query; a lost response has an uncertain outcome.
export async function invokeAction<T>(
  action: () => Promise<ApiResult<T>>,
): Promise<T> {
  let result: ApiResult<T>;
  try {
    result = await action();
  } catch (error) {
    unstable_rethrow(error);
    // Next attaches a digest to server exceptions; they are not connectivity failures.
    if (error instanceof Error && 'digest' in error)
      throw new ApiError(500, 'SERVER_ACTION_FAILED');
    throw new ApiError(0, 'NETWORK_ERROR');
  }
  return getApiDataOrThrow(result);
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
