import 'server-only';
import { apiFailure, type ApiResult } from './apiResult';
import { sessionTokens, type AuthTokens, type SessionUser } from './session';

// Reuse api.ts transport; refresh never configures a second HTTP client.
type RefreshRequest = (
  path: string,
  options: {
    method: 'POST';
    body: Record<string, never>;
    requestHeaders?: Headers;
  },
  locale: string,
  session: { refresh: string },
) => Promise<{ response: Response; result: ApiResult<unknown> }>;

type RefreshResult = {
  result: ApiResult<{ user: SessionUser }>;
  tokens?: AuthTokens;
};
// Local optimization only: the backend serializes rotation and handles bounded successor recovery.
const refreshes = new Map<string, Promise<RefreshResult>>();
export function refreshSession(
  token: string | undefined,
  locale: string,
  request: RefreshRequest,
  requestHeaders?: Headers,
): Promise<RefreshResult> {
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return Promise.resolve({
      result: apiFailure(401, 'UNAUTHENTICATED', locale),
    });
  const running = refreshes.get(token);
  if (running) return running;
  const pending = (async (): Promise<RefreshResult> => {
    try {
      // Independent timeout: one caller cancelling must not cancel another caller's refresh.
      const { response, result } = await request(
        'auth/refresh',
        { method: 'POST', body: {}, requestHeaders },
        locale,
        { refresh: token },
      );
      if (!result.success) return { result: { ...result, data: undefined } };
      const session = sessionTokens(response, result);
      if (!session)
        return { result: apiFailure(502, 'UPSTREAM_ERROR', locale) };
      return {
        result: { ...result, data: { user: session.user } },
        tokens: session.tokens,
      };
    } catch {
      return { result: apiFailure(502, 'UPSTREAM_UNAVAILABLE', locale) };
    }
  })().finally(() => refreshes.delete(token));
  refreshes.set(token, pending);
  return pending;
}
