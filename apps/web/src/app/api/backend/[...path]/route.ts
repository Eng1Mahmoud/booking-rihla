import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  fetchBackend,
  readAuthCookies,
  saveAuthCookies,
  clearAuthCookies,
} from '@/shared/lib/apiServer';
export const runtime = 'nodejs';
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
function error(status: number, code: string) {
  return NextResponse.json(
    { error: { code } },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
function cleared(response: NextResponse) {
  clearAuthCookies(response);
  return response;
}
async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  if (segments.some((part) => !/^[a-zA-Z0-9-]+$/.test(part)))
    return error(404, 'NOT_FOUND');
  const path = segments.join('/');
  // Express routes are case-insensitive; token responses must always be handled here.
  const authPath = path.toLowerCase();
  // All browser calls use our custom header; cross-origin callers cannot send it without a preflight.
  if (request.headers.get('X-CSRF-Protection') !== '1')
    return error(403, 'CSRF_REJECTED');
  const origin = request.headers.get('origin');
  const expectedOrigin = process.env.SITE_ORIGIN ?? request.nextUrl.origin;
  if (
    (origin && origin !== expectedOrigin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    return error(403, 'CSRF_REJECTED');
  if (
    request.method !== 'GET' &&
    (!origin ||
      !request.headers.get('content-type')?.startsWith('application/json'))
  )
    return error(403, 'CSRF_REJECTED');
  const { access, refresh } = readAuthCookies(request);
  const refreshing = authPath === 'auth/refresh';
  const loggingOut =
    authPath === 'auth/logout' || authPath === 'auth/logout-all';
  if ((refreshing || loggingOut) && refresh && !/^[a-f0-9]{64}$/.test(refresh))
    return cleared(error(401, 'UNAUTHENTICATED'));
  if (refreshing && !refresh) return cleared(error(401, 'UNAUTHENTICATED'));
  let body: string | undefined;
  if (request.method !== 'GET') {
    if (Number(request.headers.get('content-length') ?? 0) > 102400)
      return error(413, 'PAYLOAD_TOO_LARGE');
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > 102400) {
          await reader.cancel();
          return error(413, 'PAYLOAD_TOO_LARGE');
        }
        chunks.push(next.value);
      }
    }
    body = Buffer.concat(chunks).toString('utf8');
  }
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CSRF-Protection': '1',
      Origin: expectedOrigin,
    };
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (access && !refreshing) headers.Authorization = 'Bearer ' + access;
    if (refresh && (refreshing || loggingOut))
      headers.Cookie =
        'bus_refresh=' + refresh + '; __Secure-bus_refresh=' + refresh;
    const upstream = await fetchBackend(path + request.nextUrl.search, {
      method: request.method,
      headers,
      body,
    });
    if ((authPath === 'auth/login' || refreshing) && upstream.ok) {
      const parsed = tokensSchema.safeParse(await upstream.json());
      const cookie = upstream.headers
        .getSetCookie()
        .find((value) => /^(bus_refresh|__Secure-bus_refresh)=/.test(value));
      const token = cookie?.split(';')[0].split('=')[1];
      const expires = cookie?.match(/;\s*Expires=([^;]+)/i)?.[1];
      if (
        !parsed.success ||
        !token ||
        !/^[a-f0-9]{64}$/.test(token) ||
        !expires ||
        Number.isNaN(Date.parse(expires))
      )
        return error(502, 'UPSTREAM_ERROR');
      const response = NextResponse.json(
        { data: { user: parsed.data.data.user } },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
      saveAuthCookies(response, {
        ...parsed.data.data,
        refreshToken: token,
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
    )
      clearAuthCookies(response);
    return response;
  } catch {
    return error(502, 'UPSTREAM_UNAVAILABLE');
  }
}
export {
  forwardRequest as GET,
  forwardRequest as POST,
  forwardRequest as PUT,
  forwardRequest as PATCH,
  forwardRequest as DELETE,
};
