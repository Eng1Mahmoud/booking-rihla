import 'server-only';
function backendUrl(path: string, search?: string) {
  const base = (
    process.env.API_BASE_URL ?? 'http://127.0.0.1:4000/api/v1'
  ).replace(/\/$/, '');
  const url = new URL(base + '/' + path);
  if (search !== undefined) url.search = search;
  return url;
}
export function fetchBackend(
  path: string,
  options: RequestInit = {},
  search?: string,
) {
  return fetch(backendUrl(path, search), {
    ...options,
    cache: 'no-store',
    redirect: 'error',
    signal: options.signal ?? AbortSignal.timeout(20000),
  });
}

class ApiUnavailableError extends Error {}
export class ApiResponseError extends Error {
  constructor(public readonly status: number) {
    super('API status ' + status);
  }
}
export async function apiGet<T>(path: string): Promise<T> {
  try {
    const response = await fetchBackend(path, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new ApiResponseError(response.status);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiResponseError) throw error;
    throw new ApiUnavailableError('Could not reach the API');
  }
}
