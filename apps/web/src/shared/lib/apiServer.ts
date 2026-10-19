// Keep this file on the Next.js server.
import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';

// Send a request to our backend; path may include query parameters.
export function fetchBackend(path: string, options: RequestInit = {}) {
  const base = process.env.API_BASE_URL;
  if (!base) throw new Error('API_BASE_URL is required');
  const url = base.replace(/\/$/, '') + '/' + path;

  return fetch(url, {
    ...options,
    cache: 'no-store', // Always request fresh data.
    redirect: 'error', // Do not follow backend redirects.
    // Use the caller's cancellation signal, or a 20-second timeout.
    signal: options.signal ?? AbortSignal.timeout(20000),
  });
}

// Keep the HTTP status so pages can handle errors such as 404.
export class ApiResponseError extends Error {
  constructor(public readonly status: number) {
    super('API status ' + status);
  }
}
// Read public JSON data for Server Components; T is the expected type.
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetchBackend(path, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new ApiResponseError(response.status);
  return response.json() as Promise<T>;
}

const production = process.env.NODE_ENV === 'production';
// Production names use __Host- with Secure cookies and no Domain.
const authCookies = {
  access: production ? '__Host-bus_access' : 'bus_web_access',
  refresh: production ? '__Host-bus_refresh' : 'bus_web_refresh',
};
// Read the token cookies sent with the incoming request.
export function readAuthCookies(request: NextRequest) {
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
    ...cookieOptions,
    maxAge: tokens.expiresIn, // Duration in seconds.
  });
  response.cookies.set(authCookies.refresh, tokens.refreshToken, {
    ...cookieOptions,
    expires: tokens.refreshExpiresAt, // Exact expiry date.
  });
}
// Expire both website cookies immediately.
export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(authCookies.access, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(authCookies.refresh, '', {
    ...cookieOptions,
    maxAge: 0,
  });
}
