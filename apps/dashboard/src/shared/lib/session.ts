import 'server-only';
import type { NextResponse } from 'next/server';
import { z } from 'zod';

// Validate only the tokens and their expiry before saving cookies.
export const tokensSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive().max(3600),
  refreshToken: z.string().regex(/^[a-f0-9]{64}$/),
  refreshExpiresAt: z.iso.datetime(),
});
export type AuthTokens = z.infer<typeof tokensSchema>;
type CookieWriter = Pick<NextResponse['cookies'], 'set'>;

const isProduction = process.env.NODE_ENV === 'production';
export const authCookies = {
  access: isProduction ? '__Host-dashboard_access' : 'bus_dashboard_access',
  refresh: isProduction ? '__Host-dashboard_refresh' : 'bus_dashboard_refresh',
};
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

// Pass request.cookies in Proxy, or await cookies() on the server.
export function getSessionCookies(cookieStore: {
  get(name: string): { value: string } | undefined;
}) {
  return {
    access: cookieStore.get(authCookies.access)?.value,
    refresh: cookieStore.get(authCookies.refresh)?.value,
  };
}

// Save only the tokens, never the user object.
export function setSessionCookies(
  cookieStore: CookieWriter,
  tokens: AuthTokens,
) {
  cookieStore.set(authCookies.access, tokens.accessToken, {
    ...cookieOptions,
    maxAge: tokens.expiresIn,
  });
  cookieStore.set(authCookies.refresh, tokens.refreshToken, {
    ...cookieOptions,
    expires: new Date(tokens.refreshExpiresAt),
  });
}

export function deleteSessionCookies(cookieStore: CookieWriter) {
  for (const name of Object.values(authCookies)) {
    cookieStore.set(name, '', {
      ...cookieOptions,
      maxAge: 0,
      expires: new Date(0),
    });
  }
}
