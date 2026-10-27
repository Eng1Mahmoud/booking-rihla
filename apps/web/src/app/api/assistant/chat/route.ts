import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionCookies } from '@/shared/lib/session';
import { backendClientContext } from '@/shared/lib/clientIdentity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== requestUrl.origin) {
    return Response.json(
      { success: false, code: 'FORBIDDEN', message: 'Invalid request origin' },
      { status: 403 },
    );
  }
  if (
    request.headers.get('Content-Type')?.split(';')[0].trim() !==
    'application/json'
  ) {
    return Response.json(
      { success: false, code: 'VALIDATION_ERROR', message: 'JSON required' },
      { status: 415 },
    );
  }
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl)
    return Response.json(
      {
        success: false,
        code: 'ASSISTANT_UNAVAILABLE',
        message: 'Assistant unavailable',
      },
      { status: 503 },
    );

  try {
    const reader = request.body?.getReader();
    if (!reader)
      return Response.json(
        { success: false, code: 'VALIDATION_ERROR', message: 'Body required' },
        { status: 400 },
      );
    const decoder = new TextDecoder();
    let body = '',
      bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 96 * 1024) {
          await reader.cancel();
          return Response.json(
            {
              success: false,
              code: 'VALIDATION_ERROR',
              message: 'Payload too large',
            },
            { status: 413 },
          );
        }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } finally {
      reader.releaseLock();
    }

    const cookieStore = await cookies();
    const cookieName =
      process.env.NODE_ENV === 'production'
        ? '__Host-rihla_assistant'
        : 'rihla_assistant';
    const existing = z.uuid().safeParse(cookieStore.get(cookieName)?.value);
    const sessionId = existing.success ? existing.data : randomUUID();
    const url = new URL(baseUrl.replace(/\/$/, '') + '/assistant/chat');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'X-Assistant-Session': sessionId,
      ...(await backendClientContext('POST', url, request.headers)),
    };
    const access = getSessionCookies(cookieStore).access;
    if (access) headers.Authorization = 'Bearer ' + access;
    const configuredTimeout = Number(
      process.env.AI_REQUEST_TIMEOUT_MS ?? 30000,
    );
    const timeoutMs =
      Number.isSafeInteger(configuredTimeout) &&
      configuredTimeout >= 1 &&
      configuredTimeout <= 120000
        ? configuredTimeout
        : 30000;
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(timeoutMs + 5000),
    ]);
    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal,
      cache: 'no-store',
      redirect: 'error',
    });
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
    for (const name of [
      'X-Conversation-Id',
      'Content-Type',
      'x-vercel-ai-ui-message-stream',
      'Retry-After',
    ]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
    response.cookies.set(cookieName, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 1800,
    });
    return response;
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError');
    return Response.json(
      {
        success: false,
        code: timedOut ? 'ASSISTANT_TIMEOUT' : 'ASSISTANT_UNAVAILABLE',
        message: 'Assistant unavailable. Use normal search or retry.',
      },
      { status: timedOut ? 504 : 503 },
    );
  }
}
