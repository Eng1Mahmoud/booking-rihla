import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { headers } from 'next/headers';

// Enable only behind an ingress that overwrites this header and blocks origin bypass.
// Never infer trust from arbitrary X-Forwarded-For supplied by a browser.
export async function backendClientContext(
  method: string,
  url: URL,
  incoming?: Headers,
): Promise<Record<string, string>> {
  const header = process.env.TRUSTED_CLIENT_IP_HEADER;
  const secret = process.env.API_CLIENT_CONTEXT_SECRET;
  if (!header && !secret) return {};
  if (
    !header ||
    !/^[a-z0-9-]+$/i.test(header) ||
    !secret ||
    !/^[a-fA-F0-9]{64}$/.test(secret)
  )
    throw new Error(
      'Configure trusted client IP header and independent client context secret together',
    );
  const ip = (incoming ?? (await headers())).get(header)?.trim();
  if (!ip || !isIP(ip))
    throw new Error('Trusted ingress must supply one valid client IP');
  const timestamp = String(Date.now());
  const payload = [
    timestamp,
    method.toUpperCase(),
    url.pathname + url.search,
    ip,
  ].join('\n');
  return {
    'X-Web-Client-IP': ip,
    'X-Web-Client-Time': timestamp,
    'X-Web-Client-Signature': createHmac('sha256', Buffer.from(secret, 'hex'))
      .update(payload)
      .digest('hex'),
  };
}
