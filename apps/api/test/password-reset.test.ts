import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import type { PasswordResetService } from '../src/services/passwordResetService.ts';
import { AppError } from '../src/errors/AppError.ts';
import {
  hashVerificationCode,
  hashPasswordResetCode,
  matchesPasswordResetCode,
  encryptPasswordResetCode,
  decryptPasswordResetCode,
  decryptVerificationCode,
} from '../src/utils/authCrypto.ts';
import {
  passwordResetEmail,
  passwordChangedEmail,
} from '../src/emails/passwordResetEmail.ts';
const json = { 'Content-Type': 'application/json' };
const valid = {
  email: ' USER@EXAMPLE.TEST ',
  code: '012345',
  newPassword: 'New-password-2026',
  confirmPassword: 'New-password-2026',
};
function fakeService(): PasswordResetService {
  return { async requestReset() {}, async resetPassword() {} };
}
async function startServer(t: TestContext, service = fakeService()) {
  const server = createApp([], { passwordReset: service }).listen(
    0,
    '127.0.0.1',
  );
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
test('forgot-password normalizes email and returns generic non-cacheable 202 without credentials', async (t) => {
  let received: unknown;
  const service = fakeService();
  service.requestReset = async (email) => {
    received = email;
  };
  const base = await startServer(t, service);
  const response = await fetch(base + '/forgot-password', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ email: valid.email }),
  });
  assert.equal(response.status, 202);
  assert.equal(received, 'user@example.test');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    message:
      'If recovery is available for this account, a password reset email will be sent',
  });
});
test('password reset validates confirmation, password policy, code strings and readonly fields before writes', async (t) => {
  let calls = 0;
  const service = fakeService();
  service.resetPassword = async () => {
    calls++;
  };
  const base = await startServer(t, service);
  for (const body of [
    {},
    { ...valid, confirmPassword: 'Other-password-2026' },
    { ...valid, newPassword: 'short', confirmPassword: 'short' },
    {
      ...valid,
      newPassword: 'x'.repeat(129),
      confirmPassword: 'x'.repeat(129),
    },
    { ...valid, code: 123456 },
    { ...valid, code: '12345' },
    { ...valid, email: 'bad' },
    { ...valid, userId: randomUUID() },
  ])
    assert.equal(
      (
        await fetch(base + '/reset-password', {
          method: 'POST',
          headers: json,
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
  assert.equal(calls, 0);
});
test('valid reset forwards the normalized input and never issues a session cookie', async (t) => {
  let received: unknown;
  const service = fakeService();
  service.resetPassword = async (input) => {
    received = input;
  };
  const base = await startServer(t, service);
  const response = await fetch(base + '/reset-password', {
    method: 'POST',
    headers: json,
    body: JSON.stringify(valid),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(received, { ...valid, email: 'user@example.test' });
  assert.equal(response.headers.get('set-cookie'), null);
  assert.ok(!(await response.text()).includes(valid.newPassword));
});
test('recovery rejects unsupported HTTP inputs and preserves safe errors', async (t) => {
  const fail = async () => {
    throw Error('private database credentials');
  };
  const base = await startServer(t, {
    requestReset: fail,
    resetPassword: fail,
  });
  for (const [path, body] of [
    ['/forgot-password', { email: valid.email }],
    ['/reset-password', valid],
  ] as const) {
    assert.equal(
      (await fetch(base + path, { method: 'POST', body: 'text' })).status,
      415,
    );
    assert.equal(
      (
        await fetch(base + path + '?extra=1', {
          method: 'POST',
          headers: json,
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
    const response = await fetch(base + path, {
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
  const service = fakeService();
  service.resetPassword = async () => {
    throw new AppError(
      400,
      'INVALID_RESET_CODE',
      'Invalid or expired password reset code',
    );
  };
  const expected = await startServer(t, service);
  const response = await fetch(expected + '/reset-password', {
    method: 'POST',
    headers: json,
    body: JSON.stringify(valid),
  });
  assert.equal((await response.json()).error.code, 'INVALID_RESET_CODE');
});
test('forgot-password IP throttle returns 429 after ten requests', async (t) => {
  const base = await startServer(t);
  const requests = await Promise.all(
    Array.from({ length: 10 }, () =>
      fetch(base + '/forgot-password', {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ email: 'user@example.test' }),
      }),
    ),
  );
  assert.ok(requests.every((response) => response.status === 202));
  const response = await fetch(base + '/forgot-password', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ email: 'user@example.test' }),
  });
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, 'RATE_LIMITED');
  assert.ok(response.headers.get('retry-after'));
});
test('reset crypto is isolated from activation and reset/change templates support both languages', () => {
  process.env['AUTH_CODE_SECRET'] = randomBytes(32).toString('hex');
  const id = randomUUID(),
    code = '012345';
  const digest = hashPasswordResetCode(id, code);
  assert.notEqual(digest, hashVerificationCode(id, code));
  assert.ok(matchesPasswordResetCode(id, code, digest));
  const encrypted = encryptPasswordResetCode(id, code);
  assert.equal(decryptPasswordResetCode(id, encrypted), code);
  assert.throws(() => decryptVerificationCode(id, encrypted));
  assert.throws(() => decryptPasswordResetCode(randomUUID(), encrypted));
  assert.match(passwordResetEmail(code, 'ar').html, /dir="rtl"/);
  assert.match(passwordResetEmail(code, 'en').text, /012345/);
  assert.ok(!passwordChangedEmail('en').text.includes(code));
  assert.throws(() => passwordResetEmail('<bad>', 'en'));
});
