// Keep this file on the Next.js server.
import 'server-only';
import type { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import type { ApiResult } from './apiResult';

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

const tokensSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
  }),
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive().max(3600),
});

export type SessionUser = z.infer<typeof tokensSchema>['user'];

// Extract backend tokens here only. ApiResult never contains access or refresh credentials.
export function sessionTokens(response: Response, result: ApiResult<unknown>) {
  const parsed = tokensSchema.safeParse(result.data);
  const cookie = response.headers
    .getSetCookie()
    .find((value) => /^(bus_refresh|__Secure-bus_refresh)=/.test(value));
  const refreshToken = cookie?.split(';')[0].split('=')[1];
  const expires = cookie?.match(/;\s*Expires=([^;]+)/i)?.[1];
  if (
    !parsed.success ||
    !refreshToken ||
    !/^[a-f0-9]{64}$/.test(refreshToken) ||
    !expires ||
    Number.isNaN(Date.parse(expires))
  )
    return null;
  return {
    user: parsed.data.user,
    tokens: {
      accessToken: parsed.data.accessToken,
      expiresIn: parsed.data.expiresIn,
      refreshToken,
      refreshExpiresAt: new Date(expires),
    },
  };
}
