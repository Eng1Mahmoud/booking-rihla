import 'server-only';
export class ApiUnavailableError extends Error {}
export class ApiResponseError extends Error {
  constructor(public readonly status: number) {
    super('API status ' + status);
  }
}
export async function apiGet<T>(path: string): Promise<T> {
  const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:4000/api/v1';
  try {
    const response = await fetch(
      new URL(path, base.endsWith('/') ? base : base + '/'),
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new ApiResponseError(response.status);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiResponseError) throw error;
    throw new ApiUnavailableError('Could not reach the API');
  }
}
