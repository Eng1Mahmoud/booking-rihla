import {
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import { parseAuthEnv } from '../config/env.ts';
function secret() {
  return Buffer.from(parseAuthEnv(process.env).AUTH_CODE_SECRET, 'hex');
}
export function newVerificationCode() {
  return randomInt(1000000).toString().padStart(6, '0');
}
export function hashVerificationCode(userId: string, code: string) {
  return createHmac('sha256', secret())
    .update('verification:' + userId + ':' + code)
    .digest('hex');
}
export function matchesVerificationCode(
  userId: string,
  code: string,
  expectedHash: string,
) {
  const actual = Buffer.from(hashVerificationCode(userId, code), 'hex'),
    expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function encryptionKey() {
  return createHmac('sha256', secret())
    .update('verification-outbox-key')
    .digest();
}
export function encryptVerificationCode(userId: string, code: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  const ciphertext = Buffer.concat([
    cipher.update(code, 'utf8'),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((value) => value.toString('base64url'))
    .join('.');
}
export function decryptVerificationCode(userId: string, payload: string) {
  const parts = payload.split('.');
  if (parts.length !== 3)
    throw new Error('Invalid encrypted verification payload');
  const [iv, tag, ciphertext] = parts.map((value) =>
    Buffer.from(value, 'base64url'),
  );
  if (!iv || !tag || !ciphertext)
    throw new Error('Invalid encrypted verification payload');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}
