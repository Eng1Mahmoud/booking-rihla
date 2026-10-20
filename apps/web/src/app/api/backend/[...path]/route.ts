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
    {
      success: false,
      code,
      message: 'The request could not be completed. Please try again.',
    },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
  if (clearSession) clearAuthCookies(response);
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

  // Read cookies; auth path checks match Express case-insensitive routing.
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
    // Forward the request with our own credentials and headers.
    const body = await readBody(request);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CSRF-Protection': '1',
      Origin: websiteOrigin,
      'Accept-Language': request.headers.get('accept-language') ?? 'en',
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

    // Login/refresh returns user JSON and stores tokens only in HttpOnly cookies.
    if ((authPath === 'auth/login' || refreshing) && upstream.ok) {
      const payload = await upstream.json();
      const parsed = tokensSchema.safeParse(payload);
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
        {
          success: true,
          code: payload.code,
          message: payload.message,
          data: { user: parsed.data.data.user },
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
      saveAuthCookies(response, {
        ...parsed.data.data,
        refreshToken,
        refreshExpiresAt: new Date(expires),
      });
      return response;
    }
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
