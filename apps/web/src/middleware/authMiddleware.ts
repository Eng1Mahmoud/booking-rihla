import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  authCookies,
  readAuthCookies,
  saveAuthCookies,
  clearAuthCookies,
  type AuthTokens,
  readWithSession,
} from '@/features/auth/lib/auth.server';
import type { AuthUser } from '@/features/auth/types/auth';
import { protectedRoute, routeInfo } from './roleRoutes';

export async function authMiddleware(
  request: NextRequest,
  response: NextResponse | null,
): Promise<NextResponse | null> {
  const { locale, path } = routeInfo(request.nextUrl.pathname);
  const rule = protectedRoute(path);
  const session = readAuthCookies(request);
  let renewed: AuthTokens | undefined;
  const toLogin = () => {
    if (!rule) {
      // Public pages remain public, but an invalid session must not reach the render cache.
      request.cookies.delete(authCookies.access);
      request.cookies.delete(authCookies.refresh);
      const next = NextResponse.next({ request: { headers: request.headers } });
      clearAuthCookies(next);
      return next;
    }
    const login = new URL('/' + locale + '/login', request.url);
    login.searchParams.set('returnTo', path + request.nextUrl.search);
    const redirect = NextResponse.redirect(login);
    redirect.headers.set('Cache-Control', 'private, no-store');
    clearAuthCookies(redirect);
    return redirect;
  };
  const unavailable = () => {
    const unavailableResponse = new NextResponse(
      locale === 'ar'
        ? 'تعذر التحقق من الجلسة الآن. حاول مجددًا.'
        : 'Could not verify your session right now. Please try again.',
      {
        status: 503,
        headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '5' },
      },
    );
    // Rotation may have succeeded before the next backend read failed. Keep the new pair.
    if (renewed) saveAuthCookies(unavailableResponse, renewed);
    return unavailableResponse;
  };
  if (!session.access && !session.refresh) return rule ? toLogin() : response;
  try {
    // Express verifies the token, live session and current database role.
    const read = await readWithSession<AuthUser>('auth/me', session, {
      locale,
      requestHeaders: request.headers,
    });
    const { result } = read;
    renewed = read.tokens ?? undefined;
    if (result.status === 401) return toLogin();
    if (!result.success) return unavailable();
    const role = z
      .enum(['USER', 'ADMIN', 'SUPER_ADMIN'])
      .safeParse(result.data?.role);
    if (!role.success) return unavailable();
    if (rule && !rule.roles.includes(role.data)) {
      const forbidden = NextResponse.redirect(
        new URL('/' + locale + '/forbidden', request.url),
      );
      forbidden.headers.set('Cache-Control', 'private, no-store');
      if (renewed) saveAuthCookies(forbidden, renewed);
      return forbidden;
    }
    if (!renewed) return response;
    // Forward the renewed Cookie header to this render, not just the next navigation.
    request.cookies.set(authCookies.access, renewed.accessToken);
    request.cookies.set(authCookies.refresh, renewed.refreshToken);
    const next = NextResponse.next({ request: { headers: request.headers } });
    saveAuthCookies(next, renewed);
    return next;
  } catch {
    // A failed check must not allow a protected page through or expose exception details.
    console.error(JSON.stringify({ event: 'web_session_verification_failed' }));
    return unavailable();
  }
}
