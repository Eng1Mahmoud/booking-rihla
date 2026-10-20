import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/shared/lib/apiFetch';
import {
  readAuthCookies,
  saveAuthCookies,
  clearAuthCookies,
  type AuthTokens,
} from '@/shared/lib/authCookies';

export const runtime = 'nodejs';
const MAX_BODY_BYTES = 100 * 1024;

function errorResponse(status: number, code: string) {
  const response = NextResponse.json(
    {
      success: false,
      code,
      message: 'The request could not be completed. Please try again.',
    },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
  return response;
}

// Read the body in chunks so the 100KB limit also works without Content-Length.
async function readBody(request: NextRequest) {
  if (request.method === 'GET') return undefined;
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    throw new RangeError('PAYLOAD_TOO_LARGE');
  }

  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError('PAYLOAD_TOO_LARGE');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Every /api/backend/... request enters here, regardless of its HTTP method.
async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  // Read the path and reject cross-site requests.
  const { path: segments } = await context.params;
  if (segments.some((part) => !/^[a-zA-Z0-9-]+$/.test(part))) {
    return errorResponse(404, 'NOT_FOUND');
  }
  const path = segments.join('/');
  const websiteOrigin = process.env.SITE_ORIGIN ?? request.nextUrl.origin;
  const origin = request.headers.get('origin');
  if (
    request.headers.get('X-CSRF-Protection') !== '1' ||
    (origin && origin !== websiteOrigin) ||
    request.headers.get('sec-fetch-site') === 'cross-site' ||
    (request.method !== 'GET' &&
      (!origin ||
        !request.headers.get('content-type')?.startsWith('application/json')))
  ) {
    return errorResponse(403, 'CSRF_REJECTED');
  }

  try {
    const body = await readBody(request);
    let updatedTokens: AuthTokens | null | undefined;
    const idempotencyKey = request.headers.get('Idempotency-Key');
    // apiFetch owns authentication, refresh and token parsing; this handler writes its cookies.
    const { status, retryAfter, ...result } = await apiFetch(
      path + request.nextUrl.search,
      {
        method: request.method,
        body,
        signal: request.signal,
        headers: idempotencyKey
          ? { 'Idempotency-Key': idempotencyKey }
          : undefined,
        locale: request.headers.get('accept-language') ?? 'en',
        session: readAuthCookies(request),
        onSession: (tokens) => {
          updatedTokens = tokens;
        },
      },
    );
    const response = NextResponse.json(result, {
      status,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
    if (retryAfter) response.headers.set('Retry-After', retryAfter);
    if (updatedTokens === null) clearAuthCookies(response);
    else if (updatedTokens) saveAuthCookies(response, updatedTokens);
    return response;
  } catch (error) {
    if (error instanceof RangeError && error.message === 'PAYLOAD_TOO_LARGE') {
      return errorResponse(413, 'PAYLOAD_TOO_LARGE');
    }
    return errorResponse(502, 'UPSTREAM_UNAVAILABLE');
  }
}

// One handler supports all methods used by feature API functions.
export {
  forwardRequest as GET,
  forwardRequest as POST,
  forwardRequest as PUT,
  forwardRequest as PATCH,
  forwardRequest as DELETE,
};
