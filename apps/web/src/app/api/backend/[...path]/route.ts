import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchBackend } from '@/shared/lib/apiClient';
import {
  readAuthCookies,
  saveAuthCookies,
  clearAuthCookies,
} from '@/shared/lib/authCookies';

export const runtime = 'nodejs';
const MAX_BODY_BYTES = 100 * 1024;

// Validate token responses before writing website cookies.
const tokensSchema = z.object({
  data: z.object({
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      phone: z.string(),
      role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
    }),
    accessToken: z.string().min(1),
    expiresIn: z.number().int().positive().max(3600),
  }),
});

function errorResponse(status: number, code: string, clearSession = false) {
  const response = NextResponse.json(
    { error: { code } },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
  if (clearSession) clearAuthCookies(response);
  return response;
}

// Only our website may make cookie-authenticated browser requests.
function isAllowedRequest(request: NextRequest, websiteOrigin: string) {
  const origin = request.headers.get('origin');
  if (request.headers.get('X-CSRF-Protection') !== '1') return false;
  if (origin && origin !== websiteOrigin) return false;
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;

  if (request.method !== 'GET') {
    return Boolean(
      origin &&
      request.headers.get('content-type')?.startsWith('application/json'),
    );
  }
  return true;
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

// Login/refresh: keep tokens in HttpOnly cookies and return only the user as JSON.
async function sessionResponse(upstream: Response) {
  const parsed = tokensSchema.safeParse(await upstream.json());
  const cookie = upstream.headers
    .getSetCookie()
    .find((value) => /^(bus_refresh|__Secure-bus_refresh)=/.test(value));
  const refreshToken = cookie?.split(';')[0].split('=')[1];
  const expires = cookie?.match(/;\s*Expires=([^;]+)/i)?.[1];
  if (
    !parsed.success ||
    !refreshToken ||
    !/^[a-f0-9]{64}$/.test(refreshToken) ||
    !expires ||
    Number.isNaN(Date.parse(expires))
  ) {
    return errorResponse(502, 'UPSTREAM_ERROR');
  }

  const response = NextResponse.json(
    { data: { user: parsed.data.data.user } },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
  saveAuthCookies(response, {
    ...parsed.data.data,
    refreshToken,
    refreshExpiresAt: new Date(expires),
  });
  return response;
}

// Other endpoints: preserve the backend body/status without forwarding its cookies.
async function backendResponse(upstream: Response) {
  const response = new NextResponse(
    upstream.status === 204 ? null : await upstream.arrayBuffer(),
    {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ?? 'application/json',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
  const retryAfter = upstream.headers.get('retry-after');
  if (retryAfter) response.headers.set('Retry-After', retryAfter);
  return response;
}

// Every /api/backend/... request enters here, regardless of its HTTP method.
async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  // 1. Read the path and reject cross-site requests before reading cookies/body.
  const { path: segments } = await context.params;
  if (segments.some((part) => !/^[a-zA-Z0-9-]+$/.test(part))) {
    return errorResponse(404, 'NOT_FOUND');
  }
  const path = segments.join('/');
  const websiteOrigin = process.env.SITE_ORIGIN ?? request.nextUrl.origin;
  if (!isAllowedRequest(request, websiteOrigin)) {
    return errorResponse(403, 'CSRF_REJECTED');
  }

  // 2. Read website cookies; Express auth paths are case-insensitive.
  const authPath = path.toLowerCase();
  const refreshing = authPath === 'auth/refresh';
  const loggingOut =
    authPath === 'auth/logout' || authPath === 'auth/logout-all';
  const { access, refresh } = readAuthCookies(request);
  const invalidRefresh = refresh && !/^[a-f0-9]{64}$/.test(refresh);
  if (
    ((refreshing || loggingOut) && invalidRefresh) ||
    (refreshing && !refresh)
  ) {
    return errorResponse(401, 'UNAUTHENTICATED', true);
  }

  try {
    // 3. Forward only our headers and credentials to the fixed backend address.
    const body = await readBody(request);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CSRF-Protection': '1',
      Origin: websiteOrigin,
    };
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (access && !refreshing) headers.Authorization = 'Bearer ' + access;
    if (refresh && (refreshing || loggingOut)) {
      headers.Cookie =
        'bus_refresh=' + refresh + '; __Secure-bus_refresh=' + refresh;
    }
    const upstream = await fetchBackend(path + request.nextUrl.search, {
      method: request.method,
      headers,
      body,
    });

    // 4. Save login/refresh tokens, or return the normal backend response.
    if ((authPath === 'auth/login' || refreshing) && upstream.ok) {
      return await sessionResponse(upstream);
    }
    const response = await backendResponse(upstream);
    if (
      (refreshing && upstream.status === 401) ||
      (loggingOut && upstream.ok) ||
      (authPath === 'auth/reset-password' && upstream.ok)
    ) {
      clearAuthCookies(response);
    }
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
