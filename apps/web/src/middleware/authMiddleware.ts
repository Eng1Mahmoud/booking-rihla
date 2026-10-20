import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import {
  authCookies,
  readAuthCookies,
  saveAuthCookies,
  clearAuthCookies,
  type AuthTokens,
} from '@/shared/lib/authCookies';
import { apiFetch } from '@/shared/lib/apiFetch';
import type { UserRole } from '@/features/auth/types/auth';
import { protectedRoute, routeInfo } from './roleRoutes';

// Match the backend's signature, token purpose and required claims.
async function readRole(token?: string): Promise<UserRole | null> {
  const secret = process.env.AUTH_ACCESS_SECRET;
  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error('AUTH_ACCESS_SECRET is missing or invalid');
  }
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, Buffer.from(secret, 'hex'), {
      algorithms: ['HS256'],
      issuer: 'bus-booking',
      audience: 'bus-booking-api',
      typ: 'JWT',
      requiredClaims: ['sub', 'sid', 'iat', 'exp', 'jti'],
      maxTokenAge: '15m',
    });
    const role = z
      .enum(['USER', 'ADMIN', 'SUPER_ADMIN'])
      .safeParse(payload.role);
    if (
      payload.tokenUse !== 'access' ||
      !z.uuid().safeParse(payload.sub).success ||
      !z.uuid().safeParse(payload.sid).success ||
      !role.success
    )
      return null;
    return role.data;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  request: NextRequest,
  response: NextResponse | null,
): Promise<NextResponse | null> {
  const { locale, path } = routeInfo(request.nextUrl.pathname);
  const rule = protectedRoute(path);
  const session = readAuthCookies(request);
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
  const unavailable = () =>
    new NextResponse(
      locale === 'ar'
        ? 'تعذر التحقق من الجلسة الآن. حاول مجددًا.'
        : 'Could not verify your session right now. Please try again.',
      {
        status: 503,
        headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '5' },
      },
    );
  if (!session.access && !session.refresh) return rule ? toLogin() : response;
  try {
    let role = await readRole(session.access);
    let renewed: AuthTokens | undefined;
    if (!role) {
      if (!session.refresh) return toLogin();
      // Reuse apiFetch's single-flight refresh; never call auth/me on navigation.
      const result = await apiFetch('auth/refresh', {
        method: 'POST',
        body: {},
        session,
        locale,
        onSession: (tokens) => {
          renewed = tokens ?? undefined;
        },
      });
      if (result.status === 401) return toLogin();
      // An outage is not an expired session: stop rendering but preserve cookies.
      if (!result.success || !renewed) return unavailable();
      role = await readRole(renewed.accessToken);
      if (!role) return toLogin();
    }
    if (rule && !rule.roles.includes(role)) {
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
    // Configuration errors must never allow a protected page through or reveal secrets.
    console.error(JSON.stringify({ event: 'web_session_verification_failed' }));
    return unavailable();
  }
}
