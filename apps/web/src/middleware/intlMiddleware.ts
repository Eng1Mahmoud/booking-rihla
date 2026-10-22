import createMiddleware from 'next-intl/middleware';
import type { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { isProtectedPath, parsePathLocale } from './roleRoutes';

const internationalization = createMiddleware(routing);

export function intlMiddleware(
  request: NextRequest,
  previousResponse: NextResponse | null,
) {
  // next-intl forwards request.headers, including cookies renewed by authMiddleware.
  const response = internationalization(request);
  for (const cookie of previousResponse?.cookies.getAll() ?? []) {
    response.cookies.set(cookie);
  }
  if (isProtectedPath(parsePathLocale(request.nextUrl.pathname).path)) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}
