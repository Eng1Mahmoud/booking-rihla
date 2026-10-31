import { routing } from '@/i18n/routing';
import type { UserRole } from '@/features/auth/types/auth';

export const protectedRoutes: { path: string; roles: UserRole[] }[] = [
  { path: '/dashboard/scan', roles: ['STAFF', 'ADMIN', 'SUPER_ADMIN'] },
  { path: '/dashboard/refunds', roles: ['SUPER_ADMIN'] },
  { path: '/dashboard/administrators', roles: ['SUPER_ADMIN'] },
  { path: '/dashboard', roles: ['ADMIN', 'SUPER_ADMIN'] },
];

const userRolePage = /^\/dashboard\/users\/[^/]+\/role\/?$/;

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

// Longest matching prefix wins, so /dashboard/scan is not swallowed by /dashboard.
export function getProtectedRoute(path: string) {
  const normalized = path.replace(/\/+$/, '') || '/';
  if (userRolePage.test(normalized)) {
    return {
      path: '/dashboard/users/:id/role',
      roles: ['SUPER_ADMIN'] as UserRole[],
    };
  }
  let best: (typeof protectedRoutes)[number] | undefined;
  for (const route of protectedRoutes) {
    const matches =
      normalized === route.path || normalized.startsWith(route.path + '/');
    if (!matches) continue;
    if (!best || route.path.length > best.path.length) best = route;
  }
  return best;
}
