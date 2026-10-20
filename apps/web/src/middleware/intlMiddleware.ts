import createMiddleware from 'next-intl/middleware';
import type { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { isProtectedRoute, routeInfo } from './roleRoutes';

const internationalization = createMiddleware(routing);

export function intlMiddleware(
  request: NextRequest,
  previousResponse: NextResponse | null,
) {
  const info = routeInfo(request.nextUrl.pathname);
  // Overwrite any caller-supplied value; the server guard uses this internal return path.
  request.headers.set('x-bus-return-to', info.path + request.nextUrl.search);
  // next-intl forwards request.headers, including any cookies renewed by authMiddleware.
  const response = internationalization(request);
  // Preserve the outgoing auth cookies when next-intl creates its rewrite/redirect.
  for (const cookie of previousResponse?.cookies.getAll() ?? []) {
    response.cookies.set(cookie);
  }
  if (isProtectedRoute(routeInfo(request.nextUrl.pathname).path)) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}
