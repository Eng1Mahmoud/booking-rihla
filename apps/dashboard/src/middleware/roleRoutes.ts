import { routing } from '@/i18n/routing';
import type { UserRole } from '@/features/auth/types/auth';

const admin: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];
const superAdmin: UserRole[] = ['SUPER_ADMIN'];
const gate: UserRole[] = ['STAFF', 'ADMIN', 'SUPER_ADMIN'];

// Listed from most specific to broadest. Matching does not depend on this order.
export const protectedRoutes: { path: string; roles: UserRole[] }[] = [
  { path: '/dashboard/scan', roles: gate },
  { path: '/dashboard/refunds', roles: superAdmin },
  { path: '/dashboard/administrators', roles: superAdmin },
  { path: '/dashboard', roles: admin },
];

// Longest paths first so specific pages win over the /dashboard fallback.
const sortedRoutes = [...protectedRoutes].sort(
  (a, b) => b.path.length - a.path.length,
);

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
  const page = path.replace(/\/+$/, '') || '/';
  return sortedRoutes.find(
    (route) => page === route.path || page.startsWith(route.path + '/'),
  );
}
