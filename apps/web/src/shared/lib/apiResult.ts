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
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR');
  }
  return unwrapApiResult(result);
}

export function validationError(locale: string): ApiResult<never> {
  return {
    success: false,
    status: 400,
    code: 'VALIDATION_ERROR',
    message: locale.startsWith('ar')
      ? 'راجع البيانات المدخلة وحاول مجددًا.'
      : 'Check your details and try again.',
  };
}

// Local failures have no backend message (network/configuration/invalid response).
export function apiFailure<T>(
  status: number,
  code: string,
  locale: string,
): ApiResult<T> {
  const message =
    status === 401
      ? locale.startsWith('ar')
        ? 'سجّل الدخول للمتابعة.'
        : 'Sign in to continue.'
      : locale.startsWith('ar')
        ? 'تعذر إكمال الطلب. حاول مجددًا.'
        : 'Could not complete the request. Please try again.';
  return { success: false, status, code, message };
}
