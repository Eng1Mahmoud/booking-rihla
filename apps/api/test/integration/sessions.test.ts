import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { decryptVerificationCode } from '../../src/utils/authCrypto.ts';
import { hashRefreshToken } from '../../src/utils/sessionTokens.ts';

test('verified sign-in, client-bound activation, rotation/replay, lockout and device revocation work in PostgreSQL', async (t) => {
  const server = createApp(['http://localhost:3000']).listen(0, '127.0.0.1');
  const users: string[] = [];
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const id of users) await db.orm.public.User.where({ id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1/auth';
  const email = 'session-' + randomUUID() + '@example.test',
    password = 'Session-password-2026';
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Protection': '1',
  };
  async function post(
    path: string,
    body: object = {},
    cookie?: string,
    accessToken?: string,
  ) {
    return await fetch(base + path, {
      method: 'POST',
      headers: {
        ...headers,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
      },
      body: JSON.stringify(body),
    });
  }
  async function me(accessToken: string) {
    return await fetch(base + '/me', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });
  }
  function cookie(response: Response) {
    const value = response.headers.get('set-cookie');
    assert.ok(value);
    return value.split(';')[0]!;
  }
  async function login() {
    const response = await post('/login', { email, password });
    assert.equal(response.status, 200);
    return { cookie: cookie(response), data: (await response.json()).data };
  }
  const registration = await post('/register', {
    name: 'Session test',
    email,
    phone: '+201012345678',
    password,
  });
  assert.equal(registration.status, 202);
  const verificationId = (await registration.json()).verificationId;
  const user = await db.orm.public.User.where({ email }).first();
  assert.ok(user);
  const userId = user.id;
  users.push(userId);
  const outbox = await db.orm.public.EmailOutbox.where({ userId }).first();
  assert.ok(outbox?.encryptedCode);
  const code = decryptVerificationCode(userId, outbox.encryptedCode);
  assert.equal((await post('/login', { email, password })).status, 401);
  const duplicate = await post('/register', {
    name: 'Other client',
    email,
    phone: '+201099999999',
    password: 'Different-password-2026',
  });
  assert.equal(duplicate.status, 202);
  const wrongId = (await duplicate.json()).verificationId;
  assert.notEqual(wrongId, verificationId);
  assert.equal(
    (await post('/verify-email', { email, code, verificationId: wrongId }))
      .status,
    400,
  );
  assert.equal(
    (await db.orm.public.User.where({ id: userId }).first())?.emailVerifiedAt,
    null,
  );
  await post('/resend-verification', { email, verificationId: wrongId });
  assert.equal(
    (await db.orm.public.EmailOutbox.where({ userId }).first())?.id,
    outbox.id,
  );
  assert.equal(
    (await post('/verify-email', { email, code, verificationId })).status,
    200,
  );
  const first = await login();
  assert.equal(first.data.expiresIn, 900);
  assert.equal(first.data.user.id, userId);
  assert.ok(!('passwordHash' in first.data.user));
  assert.ok(!('refreshToken' in first.data));
  const refreshToken = first.cookie.split('=')[1]!;
  const saved = await db.orm.public.RefreshToken.where({
    tokenHash: hashRefreshToken(refreshToken),
  }).first();
  assert.ok(saved);
  assert.notEqual(saved.tokenHash, refreshToken);
  assert.equal((await me(first.data.accessToken)).status, 200);
  const changed = await post('/refresh', {}, first.cookie);
  assert.equal(changed.status, 200);
  const rotatedCookie = cookie(changed),
    rotated = (await changed.json()).data;
  assert.notEqual(rotatedCookie, first.cookie);
  assert.ok(
    (await db.orm.public.RefreshToken.where({ id: saved.id }).first())?.usedAt,
  );
  assert.equal((await post('/refresh', {}, first.cookie)).status, 401);
  assert.equal((await me(rotated.accessToken)).status, 401);
  assert.equal((await post('/refresh', {}, rotatedCookie)).status, 401);
  const parallel = await login();
  const refreshes = await Promise.all([
    post('/refresh', {}, parallel.cookie),
    post('/refresh', {}, parallel.cookie),
  ]);
  assert.deepEqual(refreshes.map((r) => r.status).sort(), [200, 401]);
  const success = refreshes.find((r) => r.status === 200);
  assert.ok(success);
  assert.equal((await me((await success.json()).data.accessToken)).status, 401);
  const a = await login(),
    b = await login();
  assert.equal((await post('/logout', {}, a.cookie)).status, 204);
  assert.equal((await me(a.data.accessToken)).status, 401);
  assert.equal((await me(b.data.accessToken)).status, 200);
  assert.equal(
    (await post('/logout-all', {}, b.cookie, b.data.accessToken)).status,
    204,
  );
  assert.equal((await me(b.data.accessToken)).status, 401);
  const disabled = await login();
  await db.orm.public.User.where({ id: userId }).update({ isActive: false });
  assert.equal((await me(disabled.data.accessToken)).status, 401);
  assert.equal((await post('/refresh', {}, disabled.cookie)).status, 401);
  assert.equal((await post('/login', { email, password })).status, 401);
  await db.orm.public.User.where({ id: userId }).update({ isActive: true });
  const expiring = await login();
  const expirationToken = await db.orm.public.RefreshToken.where({
    tokenHash: hashRefreshToken(expiring.cookie.split('=')[1]!),
  }).first();
  assert.ok(expirationToken);
  await db.orm.public.Session.where({ id: expirationToken.sessionId }).update({
    expiresAt: '2000-01-01T00:00:00Z',
  });
  assert.equal((await me(expiring.data.accessToken)).status, 401);
  assert.equal((await post('/refresh', {}, expiring.cookie)).status, 401);
  const wrongPasswords = await Promise.all(
    Array.from({ length: 5 }, () =>
      post('/login', { email, password: 'Incorrect-password-2026' }),
    ),
  );
  assert.ok(wrongPasswords.every((response) => response.status === 401));
  const locked = await db.orm.public.User.where({ id: userId }).first();
  assert.equal(locked?.loginFailures, 5);
  assert.ok(locked?.lockedUntil);
  assert.equal((await post('/login', { email, password })).status, 401);
  await db.orm.public.User.where({ id: userId }).update({
    lockedUntil: '2000-01-01T00:00:00Z',
  });
  const unlocked = await login();
  assert.equal(
    (await db.orm.public.User.where({ id: userId }).first())?.loginFailures,
    0,
  );
  assert.equal((await me(unlocked.data.accessToken)).status, 200);
});
