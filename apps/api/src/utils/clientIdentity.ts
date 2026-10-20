import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { Request, Response } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import type { AuthContext } from '../services/sessionService.ts';

// Forwarded client addresses affect throttling only, never authentication or permissions.
function signedClientIP(request: Request) {
  const secret = process.env.API_CLIENT_CONTEXT_SECRET;
  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) return undefined;
  const ip = request.get('X-Web-Client-IP');
  const timestamp = request.get('X-Web-Client-Time');
  const signature = request.get('X-Web-Client-Signature');
  if (
    !ip ||
    !isIP(ip) ||
    !timestamp ||
    !/^\d{13}$/.test(timestamp) ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    Math.abs(Date.now() - Number(timestamp)) > 30000
  )
    return undefined;
  const payload = [
    timestamp,
    request.method.toUpperCase(),
    request.originalUrl,
    ip,
  ].join('\n');
  const expected = createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(payload)
    .digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'))
    ? ip
    : undefined;
}
export function clientRateLimitKey(request: Request) {
  const ip =
    signedClientIP(request) ??
    request.ip ??
    request.socket.remoteAddress ??
    'unknown';
  return 'ip:' + ipKeyGenerator(ip);
}
export function userRateLimitKey(request: Request, response: Response) {
  const auth = response.locals['auth'] as AuthContext | undefined;
  return auth ? 'user:' + auth.user.id : clientRateLimitKey(request);
}
