import { routing } from '@/i18n/routing';
import type { UserRole } from '@/features/auth/types/auth';

const allRoles: UserRole[] = ['USER', 'ADMIN', 'SUPER_ADMIN'];

/** Paths that require a signed-in user (locale prefix already stripped). */
export const protectedPaths: { path: string; roles: UserRole[] }[] = [
  { path: '/account', roles: allRoles },
  { path: '/bookings', roles: allRoles },
  { path: '/checkout/result', roles: allRoles },
];

/** Split `/ar/...` into locale + path without locale. */
export function parsePathLocale(pathname: string) {
  const first = pathname.split('/')[1];
  const locale =
    routing.locales.find((value) => value === first) ?? routing.defaultLocale;
  return {
    locale,
    path:
      first === locale ? pathname.slice(locale.length + 1) || '/' : pathname,
  };
}

/** Matching protected-path rule, if any. */
export function matchProtectedPath(path: string) {
  return protectedPaths.find(
    (route) => path === route.path || path.startsWith(route.path + '/'),
  );
}

export function isProtectedPath(path: string) {
  return Boolean(matchProtectedPath(path));
}
