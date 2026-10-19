import { NextResponse, type NextRequest } from 'next/server';
import { readAuthCookies } from '@/shared/lib/server/authCookies';
import { fetchBackend } from '@/shared/lib/server/backend';
import { protectedRoute, routeInfo } from './roleRoutes';

export async function authMiddleware(
  request: NextRequest,
  response: NextResponse | null,
): Promise<NextResponse | null> {
  const { locale, path } = routeInfo(request.nextUrl.pathname);
  const rule = protectedRoute(path);
  if (!rule) return response;
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
  if (!access) return response;
  try {
    // Express verifies the JWT signature, session revocation and CURRENT database role.
    // No signing secret or unverified JWT role is trusted by the website.
    const backendResponse = await fetchBackend('auth/me', {
      headers: { Authorization: 'Bearer ' + access },
      signal: AbortSignal.timeout(5000),
    });
    if (backendResponse.status === 401) return refresh ? response : toLogin();
    if (!backendResponse.ok) return response; // The shared guard displays a recoverable server error.
    const result = await backendResponse.json();
    if (!rule.roles.includes(result.data?.role)) {
      const forbidden = NextResponse.redirect(
        new URL('/' + locale + '/forbidden', request.url),
      );
      forbidden.headers.set('Cache-Control', 'private, no-store');
      return forbidden;
    }
    return response;
  } catch {
    return response;
  }
}
