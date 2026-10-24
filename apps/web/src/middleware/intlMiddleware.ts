import createMiddleware from 'next-intl/middleware';
import type { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { getProtectedRoute, getRouteDetails } from './roleRoutes';

const handleLocaleRouting = createMiddleware(routing);

export function intlMiddleware(
  request: NextRequest,
  previousResponse: NextResponse | null,
) {
  // 1. Keep the original page for the protected layout's login redirect.
  const { path } = getRouteDetails(request.nextUrl.pathname);
  request.headers.set('x-bus-return-to', path + request.nextUrl.search);

  // 2. Apply the Arabic/English URL routing rules.
  const response = handleLocaleRouting(request);

  // 3. Preserve cookies set by authMiddleware, including refreshed tokens.
  for (const cookie of previousResponse?.cookies.getAll() ?? []) {
    response.cookies.set(cookie);
  }

  // 4. Protected page responses must not be cached.
  if (getProtectedRoute(path)) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}
