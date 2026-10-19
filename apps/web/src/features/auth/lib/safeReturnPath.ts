import { routeInfo } from '@/middleware/roleRoutes';
export function safeReturnPath(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.length > 4096 ||
    value.includes('\\') ||
    [...value].some((character) => character.charCodeAt(0) < 32)
  )
    return '/';
  try {
    const url = new URL(value, 'https://rihla.invalid');
    if (url.origin !== 'https://rihla.invalid') return '/';
    const path = routeInfo(url.pathname).path;
    if (
      ['/login', '/forgot-password', '/reset-password'].some(
        (auth) => path === auth || path.startsWith(auth + '/'),
      )
    )
      return '/';
    return path + url.search + url.hash;
  } catch {
    return '/';
  }
}
