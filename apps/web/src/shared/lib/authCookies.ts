// Keep this file on the Next.js server.
import 'server-only';
import type { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type CookieTarget = { cookies: Pick<NextResponse['cookies'], 'set'> };

export type AuthTokens = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
};

const production = process.env.NODE_ENV === 'production';
// Production names use __Host- with Secure cookies and no Domain.
export const authCookies = {
  access: production ? '__Host-bus_access' : 'bus_web_access',
  refresh: production ? '__Host-bus_refresh' : 'bus_web_refresh',
};
// Read the token cookies sent with the incoming request.
export function readAuthCookies(request: {
  cookies: { get(name: string): { value: string } | undefined };
}) {
  return {
    access: request.cookies.get(authCookies.access)?.value,
    refresh: request.cookies.get(authCookies.refresh)?.value,
  };
}
const cookieOptions = {
  httpOnly: true, // Browser JavaScript cannot read these cookies.
  secure: production, // Require HTTPS in production.
  sameSite: 'lax' as const, // Allow normal navigation back from checkout.
  path: '/',
};
// Save login/refresh tokens through the outgoing Set-Cookie headers.
export function saveAuthCookies(response: CookieTarget, tokens: AuthTokens) {
  response.cookies.set(authCookies.access, tokens.accessToken, {
    ...cookieOptions,
    maxAge: tokens.expiresIn, // Duration in seconds.
  });
  response.cookies.set(authCookies.refresh, tokens.refreshToken, {
    ...cookieOptions,
    expires: tokens.refreshExpiresAt, // Exact expiry date.
  });
}
// Expire both website cookies immediately.
export function clearAuthCookies(response: CookieTarget) {
  response.cookies.set(authCookies.access, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(authCookies.refresh, '', {
    ...cookieOptions,
    maxAge: 0,
  });
}

// Server Actions can write directly; proxy/Route Handlers use their response instead.
export async function updateAuthCookies(tokens: AuthTokens | null) {
  const target = { cookies: await cookies() };
  if (tokens) saveAuthCookies(target, tokens);
  else clearAuthCookies(target);
}
