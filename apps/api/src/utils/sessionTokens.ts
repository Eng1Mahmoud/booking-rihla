import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { parseSessionEnv } from '../config/env.ts';
import { userRoleSchema, type UserRole } from '../schemas/authSchema.ts';
export const accessLifetimeSeconds = 900;
export const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
function key() {
  return Buffer.from(parseSessionEnv(process.env).AUTH_ACCESS_SECRET, 'hex');
}
export function newRefreshToken() {
  return randomBytes(32).toString('hex');
}
// All API replicas derive the same immediate successor without storing plaintext tokens.
export const refreshReuseWindowMs = 30000;
export function nextRefreshToken(token: string) {
  const rotationKey = createHmac('sha256', key())
    .update('bus-refresh-rotation-v1')
    .digest();
  return createHmac('sha256', rotationKey).update(token).digest('hex');
}
export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export async function signAccessToken(
  userId: string,
  sessionId: string,
  role: UserRole,
) {
  return await new SignJWT({ sid: sessionId, role, tokenUse: 'access' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuer('bus-booking')
    .setAudience('bus-booking-api')
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(key());
}
export async function readAccessToken(token: string) {
  const { payload } = await jwtVerify(token, key(), {
    algorithms: ['HS256'],
    issuer: 'bus-booking',
    audience: 'bus-booking-api',
    typ: 'JWT',
    requiredClaims: ['sub', 'sid', 'iat', 'exp', 'jti'],
    maxTokenAge: '15m',
  });
  if (
    !z.uuid().safeParse(payload.sub).success ||
    !z.uuid().safeParse(payload.sid).success ||
    payload.tokenUse !== 'access' ||
    !userRoleSchema.safeParse(payload.role).success
  )
    throw new Error('Invalid access token claims');
  return {
    userId: payload.sub!,
    sessionId: payload.sid as string,
    role: userRoleSchema.parse(payload.role),
  };
}
