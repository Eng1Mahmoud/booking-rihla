import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { authMiddleware } from './middleware/authMiddleware';
import { isProtectedRoute, routeInfo } from './middleware/routes';
const internationalization = createMiddleware(routing);
export default async function proxy(request: NextRequest) {
  const redirect = await authMiddleware(request);
  if (redirect) return redirect;
  const response = internationalization(request);
  if (isProtectedRoute(routeInfo(request.nextUrl.pathname).path)) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}
export const config = { matcher: '/((?!api|_next|_vercel|.*\\..*).*)' };
