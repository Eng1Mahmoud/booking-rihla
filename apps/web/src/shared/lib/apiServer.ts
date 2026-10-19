import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
export function fetchBackend(
  path: string,
  options: RequestInit = {},
  search?: string,
) {
  const base = process.env.API_BASE_URL;
  if (!base) throw new Error('API_BASE_URL is required');
  const url = new URL(base.replace(/\/$/, '') + '/' + path);
  if (search !== undefined) url.search = search;

  return fetch(url, {
    ...options,
    cache: 'no-store',
    redirect: 'error',
    signal: options.signal ?? AbortSignal.timeout(20000),
  });
}

export class ApiResponseError extends Error {
  constructor(public readonly status: number) {
    super('API status ' + status);
  }
}
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetchBackend(path, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new ApiResponseError(response.status);
  return response.json() as Promise<T>;
}

const production = process.env.NODE_ENV === 'production';
const authCookies = {
  access: production ? '__Host-bus_access' : 'bus_web_access',
  refresh: production ? '__Host-bus_refresh' : 'bus_web_refresh',
};
export function readAuthCookies(request: NextRequest) {
  return {
    access: request.cookies.get(authCookies.access)?.value,
    refresh: request.cookies.get(authCookies.refresh)?.value,
  };
}
const cookieOptions = {
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
    ...cookieOptions,
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(authCookies.refresh, tokens.refreshToken, {
    ...cookieOptions,
    expires: tokens.refreshExpiresAt,
  });
}
export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(authCookies.access, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(authCookies.refresh, '', {
    ...cookieOptions,
    maxAge: 0,
  });
}
