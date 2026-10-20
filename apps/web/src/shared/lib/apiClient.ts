import { ApiError, unwrapApiResult, type ApiResult } from './apiResult';
export { ApiError, errorMessage, isUncertainRequestError } from './apiResult';

// The server reports an ended session; this event clears the client query cache.
export const SESSION_EXPIRED_EVENT = 'bus:session-expired';

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
  if (
    !result.success &&
    result.status === 401 &&
    result.code === 'UNAUTHENTICATED'
  ) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return unwrapApiResult(result);
}

// One fixed GET endpoint for payment polling. All other reads render on the server.
export async function pollPayment<T>(
  bookingId: string,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      '/api/payments/' + encodeURIComponent(bookingId) + '/status',
      {
        cache: 'no-store',
        credentials: 'same-origin',
        signal,
        headers: {
          'Accept-Language': window.location.pathname.startsWith('/ar')
            ? 'ar'
            : 'en',
        },
      },
    );
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR');
  }
  const result = await response.json().catch(() => null);
  if (!result || typeof result.success !== 'boolean')
    throw new ApiError(502, 'UPSTREAM_ERROR');
  if (response.status === 401 && result.code === 'UNAUTHENTICATED')
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  return unwrapApiResult<T>({ ...result, status: response.status });
}
