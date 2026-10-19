import { readAuthCookies } from '@/shared/lib/server/authCookies';
import { fetchBackend } from '@/shared/lib/server/backend';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import {
  isProtectedRoute,
  protectedRoute,
  routeInfo,
} from '@/shared/config/routes';
const internationalization = createMiddleware(routing);
export default async function proxy(request: NextRequest) {
  const redirect = await authMiddleware(request);
  if (redirect) return redirect;
  const response = internationalization(request);
  if (isProtectedRoute(routeInfo(request.nextUrl.pathname).path)) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}
export const config = { matcher: '/((?!api|_next|_vercel|.*\\..*).*)' };

async function authMiddleware(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { locale, path } = routeInfo(request.nextUrl.pathname);
  const rule = protectedRoute(path);
  if (!rule) return null;
  const { access, refresh } = readAuthCookies(request);
  const toLogin = () => {
    const login = new URL('/' + locale + '/login', request.url);
    login.searchParams.set('returnTo', path + request.nextUrl.search);
    const response = NextResponse.redirect(login);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
  if (!access && !refresh) return toLogin();
  // Missing/expired access with a refresh cookie is resolved by the shared session flow.
  if (!access) return null;
  try {
    // Express verifies the JWT signature, session revocation and CURRENT database role.
    // No signing secret or unverified JWT role is trusted by the website.
    const response = await fetchBackend('auth/me', {
      headers: { Authorization: 'Bearer ' + access },
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401) return refresh ? null : toLogin();
    if (!response.ok) return null; // The shared guard displays a recoverable server error.
    const result = await response.json();
    if (!rule.roles.includes(result.data?.role)) {
      const forbidden = NextResponse.redirect(
        new URL('/' + locale + '/forbidden', request.url),
      );
      forbidden.headers.set('Cache-Control', 'private, no-store');
      return forbidden;
    }
    return null;
  } catch {
    return null;
  }
}
