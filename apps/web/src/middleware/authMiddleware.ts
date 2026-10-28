import { apiFetch } from '@/shared/lib/api';
import { NextResponse, type NextRequest } from 'next/server';
import {
  authCookies,
  getSessionCookies,
  setSessionCookies,
  deleteSessionCookies,
  tokensSchema,
  type AuthTokens,
} from '@/shared/lib/session';
import type { AuthUser } from '@/features/auth/types/auth';
import { getProtectedRoute, getRouteDetails } from './roleRoutes';

export async function authMiddleware(
  request: NextRequest,
  previousResponse: NextResponse | null,
): Promise<NextResponse | null> {
  const { path, locale } = getRouteDetails(request.nextUrl.pathname);
  const protectedRoute = getProtectedRoute(path);
  const isServerAction =
    request.method === 'POST' && request.headers.has('next-action');
  let response = previousResponse ?? NextResponse.next();

  // Public navigation skips authentication; Actions still need session renewal.
  if (!protectedRoute && !isServerAction) return response;

  const session = getSessionCookies(request.cookies);
  const options = { locale, requestHeaders: request.headers };

  if (!session.access && !session.refresh) {
    return protectedRoute ? handleAuthFailure(401) : response;
  }

  // 1. Check the current session.
  let userResult = await apiFetch<AuthUser>('auth/me', {
    ...options,
    accessToken: session.access ?? null,
  });

  // 2. If access expired, call refresh directly and save the new cookies.
  if (
    userResult.status === 401 &&
    userResult.code === 'UNAUTHENTICATED' &&
    session.refresh &&
    /^[a-f0-9]{64}$/.test(session.refresh)
  ) {
    const refreshResult = await apiFetch<AuthTokens>('auth/refresh', {
      ...options,
      method: 'POST',
      body: {},
      accessToken: null,
      refreshToken: session.refresh,
    });
    if (refreshResult.success) {
      const tokens = tokensSchema.safeParse(refreshResult.data);
      if (!tokens.success) return handleAuthFailure(503);
      // Forward to the current request as well as the browser's next request.
      request.cookies.set(authCookies.access, tokens.data.accessToken);
      request.cookies.set(authCookies.refresh, tokens.data.refreshToken);
      response = NextResponse.next({ request: { headers: request.headers } });
      setSessionCookies(response.cookies, tokens.data);
      response.headers.set('Cache-Control', 'private, no-store');
      userResult = await apiFetch<AuthUser>('auth/me', {
        ...options,
        accessToken: tokens.data.accessToken,
      });
    } else {
      userResult = { ...refreshResult, data: undefined };
    }
  }

  // 3. An expired session is cleared; a backend outage keeps the cookies.
  if (userResult.status === 401) {
    request.cookies.delete(authCookies.access);
    request.cookies.delete(authCookies.refresh);
    response = NextResponse.next({ request: { headers: request.headers } });
    deleteSessionCookies(response.cookies);
    response.headers.set('Cache-Control', 'private, no-store');
    return protectedRoute ? handleAuthFailure(401) : response;
  }
  if (!userResult.success) return handleAuthFailure(503);

  // 4. Check the role returned by the backend, then allow the request.
  const role = userResult.data?.role;
  if (!role || !['USER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(role))
    return handleAuthFailure(503);
  if (protectedRoute && !protectedRoute.roles.includes(role))
    return handleAuthFailure(403);
  return response;

  // Preserve renewed cookies when redirecting, including during a temporary outage.
  function handleAuthFailure(status: 401 | 403 | 503) {
    // Actions return backend errors through invokeAction; redirects are for page navigation.
    if (isServerAction) return response;
    const destination = {
      401: '/login',
      403: '/forbidden',
      503: '/service-unavailable',
    }[status];
    const url = new URL('/' + locale + destination, request.url);
    const returnTo = path + request.nextUrl.search;
    if (status === 401 && returnTo !== '/')
      url.searchParams.set('returnTo', returnTo);
    if (status === 503)
      url.searchParams.set('returnTo', '/' + locale + returnTo);
    const errorResponse = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll())
      errorResponse.cookies.set(cookie);
    errorResponse.headers.set('Cache-Control', 'private, no-store');
    return errorResponse;
  }
}
