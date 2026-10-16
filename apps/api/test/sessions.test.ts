import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { SignJWT } from 'jose';
import { createApp } from '../src/app.ts';
import { AppError } from '../src/errors/AppError.ts';
import type { SessionService } from '../src/services/sessionService.ts';
import {
  signAccessToken,
  readAccessToken,
} from '../src/utils/sessionTokens.ts';
const user = {
  id: randomUUID(),
  name: 'Mahmoud',
  role: 'USER' as const,
  email: 'user@example.test',
  phone: '+201012345678',
  language: 'ar',
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const result = {
  user,
  accessToken: 'access-token',
  expiresIn: 900,
  refreshToken: 'a'.repeat(64),
  refreshExpiresAt: '2099-01-01T00:00:00.000Z',
};
const headers = {
  'Content-Type': 'application/json',
  'X-CSRF-Protection': '1',
};
function fakeService(): SessionService {
  return {
    async login() {
      return result;
    },
    async refresh() {
      return result;
    },
    async authenticateAccessToken(token) {
      if (token !== 'good')
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      return { user, sessionId: randomUUID() };
    },
    async logout() {},
    async logoutAll() {},
  };
}
async function startServer(t: TestContext, service = fakeService()) {
  const server = createApp(['http://localhost:3000'], {
    sessions: service,
  }).listen(0, '127.0.0.1');
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
test('login returns only access data and sets an HttpOnly Strict refresh cookie', async (t) => {
  const base = await startServer(t);
  const response = await fetch(base + '/login', {
    method: 'POST',
    headers: { ...headers, Origin: 'http://localhost:3000' },
    body: JSON.stringify({ email: user.email, password: 'Long-password-2026' }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, {
    data: { user, accessToken: result.accessToken, expiresIn: 900 },
  });
  const cookie = response.headers.get('set-cookie') ?? '';
  assert.match(cookie, /bus_refresh=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api\/v1\/auth/);
  assert.equal(
    response.headers.get('access-control-allow-credentials'),
    'true',
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('cookie mutation endpoints require CSRF header and reject untrusted origins before services', async (t) => {
  let calls = 0;
  const service = fakeService();
  service.login = async () => {
    calls++;
    return result;
  };
  service.refresh = async () => {
    calls++;
    return result;
  };
  service.logout = async () => {
    calls++;
  };
  service.logoutAll = async () => {
    calls++;
  };
  const base = await startServer(t, service);
  for (const path of ['/login', '/refresh', '/logout', '/logout-all']) {
    assert.equal(
      (
        await fetch(base + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + path, {
          method: 'POST',
          headers: { ...headers, Origin: 'https://evil.example' },
          body: '{}',
        })
      ).status,
      403,
    );
  }
  assert.equal(calls, 0);
});
test('refresh reads only the cookie, rotates it and clears invalid authentication', async (t) => {
  let received: unknown;
  const service = fakeService();
  service.refresh = async (token) => {
    received = token;
    return result;
  };
  const base = await startServer(t, service);
  const response = await fetch(base + '/refresh', {
    method: 'POST',
    headers: { ...headers, Cookie: 'bus_refresh=' + result.refreshToken },
    body: '{}',
  });
  assert.equal(response.status, 200);
  assert.equal(received, result.refreshToken);
  assert.ok(response.headers.get('set-cookie'));
  const missing = await fetch(base + '/refresh', {
    method: 'POST',
    headers,
    body: '{}',
  });
  assert.equal(missing.status, 401);
  assert.match(
    missing.headers.get('set-cookie') ?? '',
    /Expires=Thu, 01 Jan 1970/,
  );
  assert.equal(
    (
      await fetch(base + '/refresh', {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken: result.refreshToken }),
      })
    ).status,
    400,
  );
});
test('current user and logout-all require bearer authentication; logout clears cookies', async (t) => {
  const service = fakeService();
  let loggedOut: unknown;
  service.logoutAll = async (id) => {
    loggedOut = id;
  };
  const base = await startServer(t, service);
  assert.equal((await fetch(base + '/me')).status, 401);
  assert.equal(
    (await fetch(base + '/me', { headers: { Authorization: 'Bearer wrong' } }))
      .status,
    401,
  );
  const me = await fetch(base + '/me', {
    headers: { Authorization: 'Bearer good' },
  });
  assert.deepEqual(await me.json(), { data: user });
  assert.equal(
    (
      await fetch(base + '/me?extra=1', {
        headers: { Authorization: 'Bearer good' },
      })
    ).status,
    400,
  );
  const all = await fetch(base + '/logout-all', {
    method: 'POST',
    headers: { ...headers, Authorization: 'Bearer good' },
    body: '{}',
  });
  assert.equal(all.status, 204);
  assert.equal(loggedOut, user.id);
  assert.equal(await all.text(), '');
  assert.equal(
    (await fetch(base + '/logout', { method: 'POST', headers, body: '{}' }))
      .status,
    204,
  );
});
test('session validation and unexpected errors do not expose secrets', async (t) => {
  const service = fakeService();
  service.login = async () => {
    throw Error('private signing secret');
  };
  const base = await startServer(t, service);
  assert.equal(
    (await fetch(base + '/login', { method: 'POST', headers, body: '{}' }))
      .status,
    400,
  );
  assert.equal(
    (
      await fetch(base + '/login', {
        method: 'POST',
        headers: { 'X-CSRF-Protection': '1' },
        body: 'text',
      })
    ).status,
    415,
  );
  const response = await fetch(base + '/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: user.email, password: 'Long-password-2026' }),
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});
test('production refresh cookies use the Secure prefix and flag', async (t) => {
  const previous = process.env['NODE_ENV'];
  process.env['NODE_ENV'] = 'production';
  t.after(() => {
    if (previous === undefined) delete process.env['NODE_ENV'];
    else process.env['NODE_ENV'] = previous;
  });
  const base = await startServer(t);
  const response = await fetch(base + '/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: user.email, password: 'Long-password-2026' }),
  });
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get('set-cookie') ?? '',
    /__Secure-bus_refresh=.*;.*Secure/,
  );
});
test('JWT access validation rejects tampering, expired tokens, wrong audiences and wrong token use', async () => {
  process.env['AUTH_ACCESS_SECRET'] = randomBytes(32).toString('hex');
  const sid = randomUUID(),
    token = await signAccessToken(user.id, sid);
  assert.deepEqual(await readAccessToken(token), {
    userId: user.id,
    sessionId: sid,
  });
  await assert.rejects(readAccessToken(token.slice(0, -10) + 'tamperedxx'));
  for (const [audience, expiration, tokenUse] of [
    ['other-api', '15m', 'access'],
    ['bus-booking-api', 0, 'access'],
    ['bus-booking-api', '15m', 'refresh'],
  ] as const) {
    const invalid = await new SignJWT({ sid, tokenUse })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer('bus-booking')
      .setAudience(audience)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime(expiration)
      .sign(Buffer.from(process.env['AUTH_ACCESS_SECRET'], 'hex'));
    await assert.rejects(readAccessToken(invalid));
  }
});
