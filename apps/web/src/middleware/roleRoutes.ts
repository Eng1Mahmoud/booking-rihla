import { routing } from '@/i18n/routing';
import type { UserRole } from '@/features/auth/types/auth';

const allRoles: UserRole[] = ['USER', 'ADMIN', 'SUPER_ADMIN'];

// These pages and their children require one of the listed roles.
export const protectedRoutes: { path: string; roles: UserRole[] }[] = [
  { path: '/account', roles: allRoles },
  { path: '/bookings', roles: allRoles },
  { path: '/checkout/result', roles: allRoles },
];

// Example: /en/bookings becomes { locale: 'en', path: '/bookings' }.
export function getRouteDetails(pathname: string) {
  const firstSegment = pathname.split('/')[1];
  const locale =
    routing.locales.find((value) => value === firstSegment) ??
    routing.defaultLocale;
  const path =
    firstSegment === locale
      ? pathname.slice(locale.length + 1) || '/'
      : pathname;
  return { locale, path };
}

// Match the page itself or a child, such as /bookings/123.
export function getProtectedRoute(path: string) {
  return protectedRoutes.find(
    (route) => path === route.path || path.startsWith(route.path + '/'),
  );
}
