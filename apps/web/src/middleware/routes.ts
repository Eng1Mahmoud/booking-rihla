import { routing } from '@/i18n/routing';
import type { UserRole } from '@/stores/session-store';
const allRoles: UserRole[] = ['USER', 'ADMIN', 'SUPER_ADMIN'];
export const protectedRoutes: { path: string; roles: UserRole[] }[] = [
  { path: '/dashboard/admins', roles: ['SUPER_ADMIN'] },
  { path: '/dashboard/audit-logs', roles: ['SUPER_ADMIN'] },
  { path: '/dashboard', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { path: '/account', roles: allRoles },
  { path: '/bookings', roles: allRoles },
  { path: '/checkout/result', roles: allRoles },
];
export function routeInfo(pathname: string) {
  const first = pathname.split('/')[1];
  const locale =
    routing.locales.find((value) => value === first) ?? routing.defaultLocale;
  return {
    locale,
    path:
      first === locale ? pathname.slice(locale.length + 1) || '/' : pathname,
  };
}
export function protectedRoute(path: string) {
  return protectedRoutes.find(
    (route) => path === route.path || path.startsWith(route.path + '/'),
  );
}
export function isProtectedRoute(path: string) {
  return Boolean(protectedRoute(path));
}
