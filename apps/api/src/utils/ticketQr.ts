import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Production ticket QR format:
 *   RIHLA.v2.<base64url(payloadJson)>.<base64url(hmacSha256)>
 *
 * payloadJson: { t: ticketId, b: bookingId, i: issuedAtUnixSeconds }
 * HMAC key: TICKET_QR_SECRET (64 hex) or derived from AUTH_CODE_SECRET.
 * The QR never carries free-form PII; staff always resolve details server-side.
 */

const PREFIX = 'RIHLA.v2';

function qrSecret(): Buffer {
  const dedicated = process.env.TICKET_QR_SECRET?.trim();
  if (dedicated && /^[a-fA-F0-9]{64}$/.test(dedicated)) {
    return Buffer.from(dedicated, 'hex');
  }
  const auth = process.env.AUTH_CODE_SECRET?.trim();
  if (!auth || !/^[a-fA-F0-9]{64}$/.test(auth)) {
    throw new Error('Invalid environment configuration: AUTH_CODE_SECRET');
  }
  // Domain-separated key so verification codes and ticket QRs do not collide.
  return createHmac('sha256', Buffer.from(auth, 'hex'))
    .update('rihla-ticket-qr-v2')
    .digest();
}

export type TicketQrClaims = {
  ticketId: string;
  bookingId: string;
  issuedAtUnix: number;
};

function signingInput(claims: TicketQrClaims): string {
  return `v2|${claims.ticketId}|${claims.bookingId}|${claims.issuedAtUnix}`;
}

function sign(claims: TicketQrClaims): string {
  return createHmac('sha256', qrSecret())
    .update(signingInput(claims))
    .digest('base64url');
}

export function createTicketQrPayload(input: {
  ticketId: string;
  bookingId: string;
  issuedAt: Date | string;
}): string {
  const issuedAtUnix = Math.floor(new Date(input.issuedAt).getTime() / 1000);
  if (!Number.isFinite(issuedAtUnix) || issuedAtUnix <= 0) {
    throw new Error('Invalid ticket issuedAt');
  }
  const claims: TicketQrClaims = {
    ticketId: input.ticketId,
    bookingId: input.bookingId,
    issuedAtUnix,
  };
  const body = Buffer.from(
    JSON.stringify({
      t: claims.ticketId,
      b: claims.bookingId,
      i: claims.issuedAtUnix,
    }),
    'utf8',
  ).toString('base64url');
  return `${PREFIX}.${body}.${sign(claims)}`;
}

export type TicketQrParseResult =
  | { ok: true; claims: TicketQrClaims }
  | { ok: false; reason: 'MALFORMED' | 'BAD_SIGNATURE' };

export function parseAndVerifyTicketQr(payload: string): TicketQrParseResult {
  const raw = payload.trim();
  const parts = raw.split('.');
  if (parts.length !== 4 || `${parts[0]}.${parts[1]}` !== PREFIX) {
    // Accept accidental whitespace / URL decoding only; reject legacy plain ids.
    return { ok: false, reason: 'MALFORMED' };
  }
  const [, , body, sig] = parts;
  if (!body || !sig) return { ok: false, reason: 'MALFORMED' };

  let parsed: { t?: unknown; b?: unknown; i?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      t?: unknown;
      b?: unknown;
      i?: unknown;
    };
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }

  if (
    typeof parsed.t !== 'string' ||
    typeof parsed.b !== 'string' ||
    typeof parsed.i !== 'number' ||
    !parsed.t ||
    !parsed.b ||
    !Number.isFinite(parsed.i)
  ) {
    return { ok: false, reason: 'MALFORMED' };
  }

  const claims: TicketQrClaims = {
    ticketId: parsed.t,
    bookingId: parsed.b,
    issuedAtUnix: Math.trunc(parsed.i),
  };

  const expected = Buffer.from(sign(claims), 'utf8');
  const actual = Buffer.from(sig, 'utf8');
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return { ok: false, reason: 'BAD_SIGNATURE' };
  }

  return { ok: true, claims };
}
