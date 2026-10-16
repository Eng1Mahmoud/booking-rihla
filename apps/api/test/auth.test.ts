import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { hash, verify, argon2id } from 'argon2';
import { createApp } from '../src/app.ts';
import type { AuthService } from '../src/services/authService.ts';
import { AppError } from '../src/errors/AppError.ts';
import { parseAuthEnv } from '../src/config/env.ts';
import {
  encryptVerificationCode,
  decryptVerificationCode,
  hashVerificationCode,
  matchesVerificationCode,
  newVerificationCode,
} from '../src/utils/authCrypto.ts';
import { verificationEmail } from '../src/emails/verificationEmail.ts';
const json = { 'Content-Type': 'application/json' };
const valid = {
  name: ' Mahmoud ',
  email: ' MAHMOUD@EXAMPLE.COM ',
  phone: '+201012345678',
  password: 'Learning-secret-2026',
};
function fakeService(): AuthService {
  return {
    async register() {},
    async verifyEmail() {},
    async resendVerification() {},
  };
}
async function startServer(t: TestContext, service = fakeService()) {
  const server = createApp([], { auth: service }).listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/auth';
}
test('registration normalizes identity, defaults Arabic and returns generic 202 without secrets', async (t) => {
  let received: unknown;
  const service = fakeService();
  service.register = async (input) => {
    received = input;
  };
  const base = await startServer(t, service);
  const response = await fetch(base + '/register', {
    method: 'POST',
    headers: json,
    body: JSON.stringify(valid),
  });
  assert.equal(response.status, 202);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(received, {
    ...valid,
    name: 'Mahmoud',
    email: 'mahmoud@example.com',
    language: 'ar',
  });
  const body = await response.text();
  assert.ok(!body.includes(valid.password));
  assert.ok(!body.includes('passwordHash'));
  assert.ok(!body.includes('code'));
});
test('auth bodies reject weak passwords, invalid identities, extra fields and invalid codes before services', async (t) => {
  let calls = 0;
  const service = fakeService();
  service.register = async () => {
    calls++;
  };
  service.verifyEmail = async () => {
    calls++;
  };
  service.resendVerification = async () => {
    calls++;
  };
  const base = await startServer(t, service);
  for (const body of [
    { ...valid, password: 'short' },
    { ...valid, password: 'x'.repeat(129) },
    { ...valid, email: 'bad' },
    { ...valid, phone: '01012345678' },
    { ...valid, language: 'fr' },
    { ...valid, role: 'ADMIN' },
  ])
    assert.equal(
      (
        await fetch(base + '/register', {
          method: 'POST',
          headers: json,
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
  for (const code of [123456, '12345', '1234567', 'abcdef'])
    assert.equal(
      (
        await fetch(base + '/verify-email', {
          method: 'POST',
          headers: json,
          body: JSON.stringify({ email: 'user@example.com', code }),
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await fetch(base + '/resend-verification', {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ email: 'bad' }),
      })
    ).status,
    400,
  );
  assert.equal(calls, 0);
});
test('verification and resend normalize emails and preserve leading zeroes in codes', async (t) => {
  let received: unknown;
  const service = fakeService();
  service.verifyEmail = async (input) => {
    received = input;
  };
  const base = await startServer(t, service);
  const verified = await fetch(base + '/verify-email', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ email: ' USER@EXAMPLE.COM ', code: '012345' }),
  });
  assert.equal(verified.status, 200);
  assert.deepEqual(received, { email: 'user@example.com', code: '012345' });
  assert.equal(
    (
      await fetch(base + '/resend-verification', {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ email: 'user@example.com' }),
      })
    ).status,
    202,
  );
});
test('auth endpoints require JSON, reject query fields and hide unexpected failures', async (t) => {
  const fail = async () => {
    throw Error('private database details');
  };
  const base = await startServer(t, {
    register: fail,
    verifyEmail: fail,
    resendVerification: fail,
  });
  for (const [path, body] of [
    ['register', valid],
    ['verify-email', { email: 'user@example.com', code: '123456' }],
    ['resend-verification', { email: 'user@example.com' }],
  ] as const) {
    assert.equal(
      (await fetch(base + '/' + path, { method: 'POST', body: 'text' })).status,
      415,
    );
    assert.equal(
      (
        await fetch(base + '/' + path + '?extra=1', {
          method: 'POST',
          headers: json,
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
    const response = await fetch(base + '/' + path, {
      method: 'POST',
      headers: json,
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
test('auth IP rate limit returns safe JSON and Retry-After', async (t) => {
  const base = await startServer(t);
  for (let i = 0; i < 10; i++)
    assert.equal(
      (
        await fetch(base + '/register', {
          method: 'POST',
          headers: json,
          body: JSON.stringify(valid),
        })
      ).status,
      202,
    );
  const limited = await fetch(base + '/register', {
    method: 'POST',
    headers: json,
    body: JSON.stringify(valid),
  });
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error.code, 'RATE_LIMITED');
  assert.ok(limited.headers.get('retry-after'));
});
test('expected verification errors keep the generic safe code', async (t) => {
  const service = fakeService();
  service.verifyEmail = async () => {
    throw new AppError(
      400,
      'INVALID_VERIFICATION_CODE',
      'Invalid or expired verification code',
    );
  };
  const base = await startServer(t, service);
  const response = await fetch(base + '/verify-email', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ email: 'user@example.com', code: '000000' }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'INVALID_VERIFICATION_CODE');
});
test('auth crypto binds encrypted and hashed codes to their user and detects tampering', () => {
  process.env['AUTH_CODE_SECRET'] = randomBytes(32).toString('hex');
  const user = randomUUID(),
    code = newVerificationCode();
  assert.match(code, /^\d{6}$/);
  const hashed = hashVerificationCode(user, code),
    encrypted = encryptVerificationCode(user, code);
  assert.notEqual(hashed, code);
  assert.notEqual(encrypted, code);
  assert.equal(decryptVerificationCode(user, encrypted), code);
  assert.ok(matchesVerificationCode(user, code, hashed));
  assert.ok(!matchesVerificationCode(randomUUID(), code, hashed));
  assert.throws(() => decryptVerificationCode(randomUUID(), encrypted));
  const parts = encrypted.split('.');
  parts[2] = 'AAAA';
  assert.throws(() => decryptVerificationCode(user, parts.join('.')));
});
test('auth/mail configuration validates secrets without leaking them and templates support Arabic/English', () => {
  const secret = randomBytes(32).toString('hex');
  assert.equal(parseAuthEnv({ AUTH_CODE_SECRET: secret }).SMTP_PORT, 1025);
  for (const input of [
    { AUTH_CODE_SECRET: 'short' },
    { AUTH_CODE_SECRET: secret, SMTP_PORT: '0' },
    { AUTH_CODE_SECRET: secret, SMTP_USER: 'user' },
  ])
    assert.throws(() => parseAuthEnv(input));
  assert.match(verificationEmail('012345', 'ar').html, /dir="rtl"/);
  assert.match(verificationEmail('012345', 'en').text, /012345/);
  assert.throws(() => verificationEmail('<bad>', 'en'));
});
test('Argon2id password hashes verify correctly without storing the password', async () => {
  const digest = await hash(valid.password, {
    type: argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
  assert.match(digest, /^\$argon2id\$/);
  assert.ok(await verify(digest, valid.password));
  assert.ok(!(await verify(digest, 'wrong-password')));
});
