import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
const production = process.env.NODE_ENV === 'production';
export const authCookies = {
  access: production ? '__Host-bus_access' : 'bus_web_access',
  refresh: production ? '__Host-bus_refresh' : 'bus_web_refresh',
};
export function readAuthCookies(request: NextRequest) {
  return {
    access: request.cookies.get(authCookies.access)?.value,
    refresh: request.cookies.get(authCookies.refresh)?.value,
  };
}
const options = {
  httpOnly: true,
  secure: production,
  sameSite: 'lax' as const,
  path: '/',
};
export function saveAuthCookies(
  response: NextResponse,
  tokens: {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    refreshExpiresAt: Date;
  },
) {
  response.cookies.set(authCookies.access, tokens.accessToken, {
    ...options,
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(authCookies.refresh, tokens.refreshToken, {
    ...options,
    expires: tokens.refreshExpiresAt,
  });
}
export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(authCookies.access, '', { ...options, maxAge: 0 });
  response.cookies.set(authCookies.refresh, '', { ...options, maxAge: 0 });
}
// Only these two known cookie names are forwarded to our fixed backend, never browser cookies wholesale.
export function backendRefreshCookie(token: string) {
  return 'bus_refresh=' + token + '; __Secure-bus_refresh=' + token;
}
