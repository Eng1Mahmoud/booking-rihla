import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  authCookies,
  readSessionCookies,
  writeSessionCookies,
  clearSessionCookies,
  type AuthTokens,
  fetchWithSessionRefresh,
} from '@/features/auth/lib/auth.server';
import type { AuthUser } from '@/features/auth/types/auth';
import { matchProtectedPath, parsePathLocale } from './roleRoutes';

function redirectToLoginPage(
  request: NextRequest,
  locale: string,
  path: string,
) {
  const login = new URL('/' + locale + '/login', request.url);
  const returnTo = path + request.nextUrl.search;
  if (returnTo && returnTo !== '/')
    login.searchParams.set('returnTo', returnTo);
  const redirect = NextResponse.redirect(login);
  redirect.headers.set('Cache-Control', 'private, no-store');
  clearSessionCookies(redirect);
  return redirect;
}

function clearInvalidSessionOnPublicPage(request: NextRequest) {
  request.cookies.delete(authCookies.access);
  request.cookies.delete(authCookies.refresh);
  const next = NextResponse.next({ request: { headers: request.headers } });
  clearSessionCookies(next);
  return next;
}

function sessionUnavailableResponse(locale: string, renewed?: AuthTokens) {
  const response = new NextResponse(
    locale === 'ar'
      ? 'تعذر التحقق من الجلسة الآن. حاول مجددًا.'
      : 'Could not verify your session right now. Please try again.',
    {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '5' },
    },
  );
  if (renewed) writeSessionCookies(response, renewed);
  return response;
}

function redirectToForbiddenPage(
  request: NextRequest,
  locale: string,
  renewed?: AuthTokens,
) {
  const forbidden = NextResponse.redirect(
    new URL('/' + locale + '/forbidden', request.url),
  );
  forbidden.headers.set('Cache-Control', 'private, no-store');
  if (renewed) writeSessionCookies(forbidden, renewed);
  return forbidden;
}

/**
 * Edge guard: renew session cookies when needed and block protected paths.
 * RSC pages may still call getSignedInUser as a second check.
 */
export async function authMiddleware(
  request: NextRequest,
  response: NextResponse | null,
): Promise<NextResponse | null> {
  const { locale, path } = parsePathLocale(request.nextUrl.pathname);
  const rule = matchProtectedPath(path);
  const session = readSessionCookies(request);
  let renewed: AuthTokens | undefined;

  if (!session.access && !session.refresh) {
    return rule ? redirectToLoginPage(request, locale, path) : response;
  }

  try {
    const read = await fetchWithSessionRefresh<AuthUser>('auth/me', session, {
      locale,
      requestHeaders: request.headers,
    });
    const { result } = read;
    renewed = read.tokens ?? undefined;

    if (result.status === 401) {
      return rule
        ? redirectToLoginPage(request, locale, path)
        : clearInvalidSessionOnPublicPage(request);
    }
    if (!result.success) return sessionUnavailableResponse(locale, renewed);

    const role = z
      .enum(['USER', 'ADMIN', 'SUPER_ADMIN'])
      .safeParse(result.data?.role);
    if (!role.success) return sessionUnavailableResponse(locale, renewed);

    if (rule && !rule.roles.includes(role.data)) {
      return redirectToForbiddenPage(request, locale, renewed);
    }

    if (!renewed) return response;

    request.cookies.set(authCookies.access, renewed.accessToken);
    request.cookies.set(authCookies.refresh, renewed.refreshToken);
    const next = NextResponse.next({ request: { headers: request.headers } });
    writeSessionCookies(next, renewed);
    return next;
  } catch {
    console.error(JSON.stringify({ event: 'web_session_verification_failed' }));
    return sessionUnavailableResponse(locale, renewed);
  }
}
