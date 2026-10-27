import { cookies } from 'next/headers';
import { getSessionCookies } from '@/shared/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lightweight streaming proxy to the Express assistant endpoint.
 * Keeps GOOGLE_GENERATIVE_AI_API_KEY exclusively on the API server.
 */
export async function POST(request: Request) {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    return Response.json(
      { success: false, code: 'CONFIG', message: 'API_BASE_URL missing' },
      { status: 500 },
    );
  }

  const body = await request.text();
  if (body.length > 16000) {
    return Response.json(
      {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Payload too large',
      },
      { status: 400 },
    );
  }

  const access = getSessionCookies(await cookies()).access;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (access) headers.Authorization = `Bearer ${access}`;

  const upstream = await fetch(
    baseUrl.replace(/\/$/, '') + '/assistant/chat',
    {
      method: 'POST',
      headers,
      body,
      signal: request.signal,
    },
  );

  const responseHeaders = new Headers();
  const conv = upstream.headers.get('X-Conversation-Id');
  if (conv) responseHeaders.set('X-Conversation-Id', conv);
  const ct = upstream.headers.get('Content-Type');
  if (ct) responseHeaders.set('Content-Type', ct);
  responseHeaders.set('Cache-Control', 'no-store');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
