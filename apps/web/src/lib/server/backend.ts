import 'server-only';
export function backendUrl(path: string, search = '') {
  const base = (
    process.env.API_BASE_URL ?? 'http://127.0.0.1:4000/api/v1'
  ).replace(/\/$/, '');
  const url = new URL(base + '/' + path);
  url.search = search;
  return url;
}
export function fetchBackend(
  path: string,
  options: RequestInit = {},
  search = '',
) {
  return fetch(backendUrl(path, search), {
    ...options,
    cache: 'no-store',
    redirect: 'error',
    signal: options.signal ?? AbortSignal.timeout(20000),
  });
}
