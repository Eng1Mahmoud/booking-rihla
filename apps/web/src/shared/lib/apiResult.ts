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

// Prefer API message; known code fallbacks live in appErrors (lazy to avoid cycles).
export function errorMessage(error: unknown, locale: string) {
  // Dynamic import is async; keep sync path by inlining the resolver call pattern.
  // appErrors imports ApiError only as a type/value of this module — safe at runtime.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { resolveErrorMessage } = require('./appErrors') as typeof import('./appErrors');
  return resolveErrorMessage(error, locale);
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
