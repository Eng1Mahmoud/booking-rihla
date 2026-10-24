import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { headers as getRequestHeaders } from 'next/headers';

// Used for IP rate limits. The hosting proxy must overwrite the IP header.
// Requests must not bypass that trusted proxy.
export async function backendClientContext(
  method: string,
  url: URL,
  incomingHeaders?: Headers,
): Promise<Record<string, string>> {
  // 1. Read settings. If neither is set, this feature stays disabled.
  const ipHeaderName = process.env.TRUSTED_CLIENT_IP_HEADER ?? '';
  const signingSecret = process.env.API_CLIENT_CONTEXT_SECRET ?? '';
  if (!ipHeaderName && !signingSecret) return {};

  if (
    !/^[a-z0-9-]+$/i.test(ipHeaderName) ||
    !/^[a-fA-F0-9]{64}$/.test(signingSecret)
  ) {
    throw new Error(
      'Configure trusted client IP header and independent client context secret together',
    );
  }

  // 2. Read one client IP from the trusted header, never an arbitrary browser value.
  const requestHeaders = incomingHeaders ?? (await getRequestHeaders());
  const clientIP = requestHeaders.get(ipHeaderName)?.trim();
  if (!clientIP || !isIP(clientIP)) {
    throw new Error('Trusted ingress must supply one valid client IP');
  }

  // 3. Sign the IP, time and request details so the API can verify them.
  const timestamp = String(Date.now());
  const dataToSign = [
    timestamp,
    method.toUpperCase(),
    url.pathname + url.search,
    clientIP,
  ].join('\n');
  const signature = createHmac('sha256', Buffer.from(signingSecret, 'hex'))
    .update(dataToSign)
    .digest('hex');

  return {
    'X-Web-Client-IP': clientIP,
    'X-Web-Client-Time': timestamp,
    'X-Web-Client-Signature': signature,
  };
}
