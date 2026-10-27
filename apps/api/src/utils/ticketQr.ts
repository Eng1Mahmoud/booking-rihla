import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

// One signed code identifies one passenger allocation, never a whole booking.
const PREFIX = 'RIHLA.v2';
const claimsSchema = z.strictObject({
  t: z.uuid(),
  b: z.uuid(),
  s: z.uuid(),
  i: z.number().int().positive().safe(),
});

function qrSecret(): Buffer {
  const dedicated = process.env.TICKET_QR_SECRET?.trim();
  if (dedicated) {
    if (!/^[a-fA-F0-9]{64}$/.test(dedicated))
      throw new Error('Invalid environment configuration: TICKET_QR_SECRET');
    return Buffer.from(dedicated, 'hex');
  }
  const auth = process.env.AUTH_CODE_SECRET?.trim();
  if (!auth || !/^[a-fA-F0-9]{64}$/.test(auth))
    throw new Error('Invalid environment configuration: AUTH_CODE_SECRET');
  return createHmac('sha256', Buffer.from(auth, 'hex'))
    .update('rihla-ticket-qr-v2')
    .digest();
}

export type TicketQrClaims = {
  ticketId: string;
  bookingId: string;
  seatId: string;
  issuedAtUnix: number;
};

function sign(claims: TicketQrClaims): string {
  return createHmac('sha256', qrSecret())
    .update(
      `v2|${claims.ticketId}|${claims.bookingId}|${claims.seatId}|${claims.issuedAtUnix}`,
    )
    .digest('base64url');
}

export function createTicketQrPayload(input: {
  ticketId: string;
  bookingId: string;
  seatId: string;
  issuedAt: Date | string;
}): string {
  const payload = claimsSchema.parse({
    t: input.ticketId,
    b: input.bookingId,
    s: input.seatId,
    i: Math.floor(new Date(input.issuedAt).getTime() / 1000),
  });
  const claims = {
    ticketId: payload.t,
    bookingId: payload.b,
    seatId: payload.s,
    issuedAtUnix: payload.i,
  };
  return `${PREFIX}.${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}.${sign(claims)}`;
}

export type TicketQrParseResult =
  | { ok: true; claims: TicketQrClaims }
  | { ok: false; reason: 'MALFORMED' | 'BAD_SIGNATURE' };

export function parseAndVerifyTicketQr(payload: string): TicketQrParseResult {
  const raw = payload.trim();
  const parts = raw.split('.');
  if (
    raw.length > 2048 ||
    parts.length !== 4 ||
    `${parts[0]}.${parts[1]}` !== PREFIX
  )
    return { ok: false, reason: 'MALFORMED' };
  const body = parts[2];
  const signature = parts[3];
  if (
    !body ||
    !/^[A-Za-z0-9_-]+$/.test(body) ||
    !signature ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  )
    return { ok: false, reason: 'MALFORMED' };
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }
  const parsed = claimsSchema.safeParse(decoded);
  if (!parsed.success) return { ok: false, reason: 'MALFORMED' };
  const claims = {
    ticketId: parsed.data.t,
    bookingId: parsed.data.b,
    seatId: parsed.data.s,
    issuedAtUnix: parsed.data.i,
  };
  const expected = Buffer.from(sign(claims), 'utf8');
  const actual = Buffer.from(signature, 'utf8');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return { ok: false, reason: 'BAD_SIGNATURE' };
  return { ok: true, claims };
}
