/**
 * Allow only same-app relative paths after login (no open redirects).
 * Accepts optional locale prefix and query/hash.
 */
export function safeReturnPath(value?: string | string[] | null): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== 'string') return '/';
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return '/';
  }
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  if (path.includes('://') || path.includes('\\')) return '/';
  // Strip locale prefix so callers can prepend the active locale once.
  const match = path.match(/^\/(ar|en)(\/|$)/);
  if (match) path = path.slice(match[0].length - (match[2] === '/' ? 1 : 0)) || '/';
  if (!path.startsWith('/')) path = '/' + path;
  return path;
}
