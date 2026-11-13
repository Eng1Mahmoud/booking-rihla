import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';
export function checkoutKey(environment: NodeJS.ProcessEnv) {
  const result = z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/)
    .safeParse(environment['PAYMENT_CHECKOUT_SECRET']);
  if (!result.success)
    throw new Error('Invalid payment configuration: PAYMENT_CHECKOUT_SECRET');
  return Buffer.from(result.data, 'hex');
}
export function encryptCheckout(
  operationId: string,
  value: string,
  key: Buffer,
) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('paymob-checkout:' + operationId));
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    data.toString('base64url'),
  ].join('.');
}
export function decryptCheckout(
  operationId: string,
  payload: string,
  key: Buffer,
) {
  try {
    const [version, iv, tag, data, extra] = payload.split('.');
    if (version !== 'v1' || !iv || !tag || !data || extra !== undefined)
      throw new Error();
    const nonce = Buffer.from(iv, 'base64url'),
      authTag = Buffer.from(tag, 'base64url');
    if (nonce.length !== 12 || authTag.length !== 16) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(Buffer.from('paymob-checkout:' + operationId));
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('Unable to decrypt payment checkout');
  }
}
