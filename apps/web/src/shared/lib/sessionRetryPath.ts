import { getProtectedRoute, getRouteDetails } from '@/middleware/roleRoutes';
import { routing } from '@/i18n/routing';

export function getSessionRetryPath(value: unknown, locale: string) {
  const fallback = '/' + locale + '/bookings';
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\s]/.test(value)
  )
    return fallback;

  try {
    const origin = 'https://rihla.invalid';
    const url = new URL(value, origin);
    const hasLocale = routing.locales.some((language) =>
      url.pathname.startsWith('/' + language + '/'),
    );
    // Retry only localized protected pages. This also excludes this error page and API routes.
    if (
      url.origin !== origin ||
      !hasLocale ||
      !getProtectedRoute(getRouteDetails(url.pathname).path)
    )
      return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}
