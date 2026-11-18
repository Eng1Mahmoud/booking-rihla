import {
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

type AccountCodePurpose = 'VERIFY_EMAIL' | 'PASSWORD_RESET';

function readAccountCodeSecret() {
  const value = process.env.AUTH_CODE_SECRET;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value))
    throw new Error('Invalid environment configuration: AUTH_CODE_SECRET');
  return Buffer.from(value, 'hex');
}

function accountCodeContext(purpose: AccountCodePurpose, userId: string) {
  // Preserve the context used by existing challenges and queued emails.
  return purpose === 'PASSWORD_RESET' ? `password-reset:${userId}` : userId;
}

export function generateAccountCode() {
  return randomInt(1000000).toString().padStart(6, '0');
}

export function hashAccountCode(
  purpose: AccountCodePurpose,
  userId: string,
  code: string,
) {
  const context = accountCodeContext(purpose, userId);
  return createHmac('sha256', readAccountCodeSecret())
    .update(`verification:${context}:${code}`)
    .digest('hex');
}

export function matchesAccountCode(
  purpose: AccountCodePurpose,
  userId: string,
  code: string,
  storedHash: string,
) {
  const actual = Buffer.from(hashAccountCode(purpose, userId, code), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function outboxEncryptionKey() {
  return createHmac('sha256', readAccountCodeSecret())
    .update('verification-outbox-key')
    .digest();
}

export function encryptAccountCode(
  purpose: AccountCodePurpose,
  userId: string,
  code: string,
) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', outboxEncryptionKey(), nonce);
  const context = accountCodeContext(purpose, userId);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([
    cipher.update(code, 'utf8'),
    cipher.final(),
  ]);
  return [nonce, cipher.getAuthTag(), ciphertext]
    .map((value) => value.toString('base64url'))
    .join('.');
}

export function decryptAccountCode(
  purpose: AccountCodePurpose,
  userId: string,
  payload: string,
) {
  const parts = payload.split('.');
  if (parts.length !== 3)
    throw new Error('Invalid encrypted verification payload');
  const [nonce, authTag, ciphertext] = parts.map((value) =>
    Buffer.from(value, 'base64url'),
  );
  const decipher = createDecipheriv(
    'aes-256-gcm',
    outboxEncryptionKey(),
    nonce,
  );
  const context = accountCodeContext(purpose, userId);
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}
