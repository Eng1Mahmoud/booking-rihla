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
      refreshToken: session.refresh,
    });
    if (refreshResult.success && refreshResult.data) {
      const tokens = tokensSchema.safeParse(refreshResult.data);
      if (tokens.success) {
        setSessionCookies(response.cookies, tokens.data);
        userResult = await apiFetch<AuthUser>('auth/me', {
          ...options,
          accessToken: tokens.data.accessToken,
        });
      }
    }
  }

  if (!userResult.success || !userResult.data) {
    if (userResult.status === 401 || userResult.status === 403) {
      return handleAuthFailure(userResult.status);
    }
    if (isServerAction) return response;
    return handleAuthFailure(userResult.status >= 500 ? 503 : 401);
  }

  const role = userResult.data.role;
  if (!role || !['USER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return handleAuthFailure(403);
  }

  if (protectedRoute && !protectedRoute.roles.includes(role)) {
    return handleAuthFailure(403);
  }

  return response;

  function handleAuthFailure(status: number) {
    deleteSessionCookies(response.cookies);
    if (isServerAction) {
      return NextResponse.json(
        { success: false, code: status === 403 ? 'FORBIDDEN' : 'UNAUTHENTICATED' },
        { status },
      );
    }
    if (status === 403) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/forbidden`;
      return NextResponse.redirect(url);
    }
    if (status === 401) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.searchParams.set(
        'returnTo',
        request.nextUrl.pathname + request.nextUrl.search,
      );
      return NextResponse.redirect(url);
    }
    const errorResponse = NextResponse.json(
      {
        message:
          locale === 'ar'
            ? 'تعذر التحقق من الجلسة الآن. حاول مجددًا.'
            : 'Could not verify your session right now. Please try again.',
      },
      { status },
    );
    for (const cookie of response.cookies.getAll())
      errorResponse.cookies.set(cookie);
    errorResponse.headers.set('Cache-Control', 'private, no-store');
    if (status === 503) errorResponse.headers.set('Retry-After', '5');
    return errorResponse;
  }
}
