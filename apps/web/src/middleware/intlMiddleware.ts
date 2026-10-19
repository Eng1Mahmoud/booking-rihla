import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { isProtectedRoute, routeInfo } from './roleRoutes';

const internationalization = createMiddleware(routing);

export function intlMiddleware(request: NextRequest) {
  const response = internationalization(request);
  if (isProtectedRoute(routeInfo(request.nextUrl.pathname).path)) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}
