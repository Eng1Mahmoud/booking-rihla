import { routing } from '@/i18n/routing';
import type { UserRole } from '@/features/auth/types/auth';
export const protectedRoutes: { path: string; roles: UserRole[] }[] = [
  { path: '/dashboard/scan', roles: ['STAFF', 'ADMIN', 'SUPER_ADMIN'] },
  { path: '/dashboard/refunds', roles: ['SUPER_ADMIN'] },
  { path: '/dashboard/administrators', roles: ['SUPER_ADMIN'] },
  { path: '/dashboard', roles: ['ADMIN', 'SUPER_ADMIN'] },
];
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
export function getProtectedRoute(path: string) {
  return protectedRoutes.find(
    (route) => path === route.path || path.startsWith(route.path + '/'),
  );
}
