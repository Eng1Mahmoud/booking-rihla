// HTTP metadata stays on the server; Route Handlers omit status/retryAfter from JSON.
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

// Server reads may throw for their existing page-level error/notFound handling.
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
