import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
function backendUrl(path: string, search?: string) {
  const base = (
    process.env.API_BASE_URL ?? 'http://127.0.0.1:4000/api/v1'
  ).replace(/\/$/, '');
  const url = new URL(base + '/' + path);
  if (search !== undefined) url.search = search;
  return url;
}
export function fetchBackend(
  path: string,
  options: RequestInit = {},
  search?: string,
) {
  return fetch(backendUrl(path, search), {
    ...options,
    cache: 'no-store',
    redirect: 'error',
    signal: options.signal ?? AbortSignal.timeout(20000),
  });
}

class ApiUnavailableError extends Error {}
export class ApiResponseError extends Error {
  constructor(public readonly status: number) {
    super('API status ' + status);
  }
}
export async function apiGet<T>(path: string): Promise<T> {
  try {
    const response = await fetchBackend(path, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new ApiResponseError(response.status);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiResponseError) throw error;
    throw new ApiUnavailableError('Could not reach the API');
  }
}

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
