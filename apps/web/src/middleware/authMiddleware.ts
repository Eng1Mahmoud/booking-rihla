import { NextResponse, type NextRequest } from 'next/server';
import { readAuthCookies } from '@/shared/lib/authCookies';
import { apiFetch } from '@/shared/lib/apiFetch';
import type { UserRole } from '@/features/auth/types/auth';
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
    // Transitional live-role check. Local JWT verification is the next migration phase.
    const result = await apiFetch<{ role: UserRole }>('auth/me', {
      session: { access, refresh },
      locale,
      signal: AbortSignal.timeout(5000),
    });
    if (result.status === 401) return refresh ? response : toLogin();
    if (!result.success) return response; // The shared guard displays a recoverable server error.
    if (!result.data || !rule.roles.includes(result.data.role)) {
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
