import createMiddleware from 'next-intl/middleware';
import type { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { isProtectedPath, parsePathLocale } from './roleRoutes';

const internationalization = createMiddleware(routing);

export function intlMiddleware(
  request: NextRequest,
  previousResponse: NextResponse | null,
) {
  const info = parsePathLocale(request.nextUrl.pathname);
  // Used by the protected RSC layout as a fallback return path.
  request.headers.set('x-bus-return-to', info.path + request.nextUrl.search);
  const response = internationalization(request);
  for (const cookie of previousResponse?.cookies.getAll() ?? []) {
    response.cookies.set(cookie);
  }
  if (isProtectedPath(info.path)) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}
