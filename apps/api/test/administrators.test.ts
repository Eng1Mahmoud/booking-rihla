import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import {
  sessionService,
  type SessionService,
} from '../src/services/sessionService.ts';
import type { AdministratorService } from '../src/services/administratorService.ts';
import type { UserRole } from '../src/schemas/authSchema.ts';
import { AppError } from '../src/errors/AppError.ts';
const user = {
  id: randomUUID(),
  name: 'Staff',
  email: 'staff@example.test',
  phone: '+201012345678',
  role: 'ADMIN' as UserRole,
  language: 'ar',
  isActive: true,
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const actor = { ...user, id: randomUUID(), role: 'SUPER_ADMIN' as const };
const sessions: SessionService = {
  ...sessionService,
  async authenticateAccessToken(token) {
    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(token))
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return {
      sessionId: randomUUID(),
      user: { ...actor, role: token as UserRole },
    };
  },
};
const empty: AdministratorService = {
  async list() {
    return [];
  },
  async findById() {
    return null;
  },
  async updateRole() {
    return null;
  },
  async updateStatus() {
    return null;
  },
};
const headers = {
  Authorization: 'Bearer SUPER_ADMIN',
  'Content-Type': 'application/json',
};
async function start(t: TestContext, service = empty) {
  const server = createApp([], { sessions, administrators: service }).listen(
    0,
    '127.0.0.1',
  );
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/admin/admins';
}
test('administrator routes reject anonymous, passenger and ordinary admin requests before validation', async (t) => {
  let calls = 0;
  const fail = async () => {
    calls++;
    throw Error('not reached');
  };
  const base = await start(t, {
    list: fail,
    findById: fail,
    updateRole: fail,
    updateStatus: fail,
  });
  for (const [method, suffix] of [
    ['GET', ''],
    ['HEAD', ''],
    ['GET', '/invalid'],
    ['PATCH', '/invalid/role'],
    ['PATCH', '/invalid/status'],
  ])
    for (const role of ['', 'USER', 'ADMIN']) {
      const response = await fetch(base + suffix, {
        method,
        headers: role ? { Authorization: 'Bearer ' + role } : {},
      });
      assert.equal(response.status, role ? 403 : 401);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  assert.equal(calls, 0);
});
test('super admin lists normalize filters and preserve bounded pagination', async (t) => {
  let received: unknown;
  const base = await start(t, {
    ...empty,
    async list(input) {
      received = input;
      return [user];
    },
  });
  const params = new URLSearchParams({
    email: ' STAFF@EXAMPLE.TEST ',
    role: 'ADMIN',
    isActive: 'false',
    limit: '2',
    offset: '1',
  });
  const response = await fetch(base + '?' + params, { headers });
  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    email: user.email,
    role: 'ADMIN',
    isActive: false,
    limit: 2,
    offset: 1,
  });
  assert.deepEqual(await response.json(), {
    data: [user],
    pagination: { limit: 2, offset: 1 },
  });
  await fetch(base, { headers });
  assert.deepEqual(received, { limit: 20, offset: 0 });
});
test('staff detail and role/status updates forward authenticated actor and only the chosen field', async (t) => {
  let received: unknown;
  const base = await start(t, {
    ...empty,
    async findById(id) {
      assert.equal(id, user.id);
      return user;
    },
    async updateRole(auth, id, input) {
      assert.equal(auth.user.id, actor.id);
      received = { id, input };
      return { ...user, ...input };
    },
    async updateStatus(auth, id, input) {
      assert.equal(auth.user.id, actor.id);
      received = { id, input };
      return { ...user, ...input };
    },
  });
  assert.deepEqual(
    await (await fetch(base + '/' + user.id, { headers })).json(),
    { data: user },
  );
  for (const role of ['USER', 'ADMIN', 'SUPER_ADMIN']) {
    const response = await fetch(base + '/' + user.id + '/role', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(received, { id: user.id, input: { role } });
  }
  for (const isActive of [false, true]) {
    const response = await fetch(base + '/' + user.id + '/status', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ isActive }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(received, { id: user.id, input: { isActive } });
  }
});
test('invalid privilege mutations, ids, filters and extra queries never reach administrator service', async (t) => {
  let calls = 0;
  const fail = async () => {
    calls++;
    throw Error('not reached');
  };
  const base = await start(t, {
    list: fail,
    findById: fail,
    updateRole: fail,
    updateStatus: fail,
  });
  for (const query of [
    'role=USER',
    'role=OWNER',
    'email=invalid',
    'isActive=1',
    'isActive=FALSE',
    'limit=0',
    'limit=101',
    'offset=-1',
    'offset=100001',
    'role=ADMIN&role=SUPER_ADMIN',
    'userId=' + user.id,
  ])
    assert.equal((await fetch(base + '?' + query, { headers })).status, 400);
  for (const path of ['/invalid', '/' + user.id + '?extra=1'])
    assert.equal((await fetch(base + path, { headers })).status, 400);
  for (const [suffix, body] of [
    ['/role', {}],
    ['/role', { role: 'OWNER' }],
    ['/role', { role: 'ADMIN', isActive: true }],
    ['/role', { role: 'ADMIN', password: 'test' }],
    ['/status', {}],
    ['/status', { isActive: 'false' }],
    ['/status', { isActive: false, role: 'USER' }],
  ])
    assert.equal(
      (
        await fetch(base + '/' + user.id + suffix, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
  for (const suffix of ['/role', '/status']) {
    assert.equal(
      (
        await fetch(base + '/invalid' + suffix, {
          method: 'PATCH',
          headers,
          body: '{}',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(base + '/' + user.id + suffix + '?x=1', {
          method: 'PATCH',
          headers,
          body: '{}',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(base + '/' + user.id + suffix, {
          method: 'PATCH',
          headers: { Authorization: 'Bearer SUPER_ADMIN' },
          body: 'text',
        })
      ).status,
      415,
    );
  }
  assert.equal(calls, 0);
});
test('missing staff and mutation targets have safe missing responses', async (t) => {
  const base = await start(t);
  for (const [suffix, init] of [
    ['/' + user.id, {}],
    ['/' + user.id + '/role', { method: 'PATCH', body: '{"role":"ADMIN"}' }],
    [
      '/' + user.id + '/status',
      { method: 'PATCH', body: '{"isActive":false}' },
    ],
  ] as const) {
    const response = await fetch(base + suffix, { ...init, headers });
    assert.equal(response.status, 404);
    assert.equal(
      (await response.json()).error.code,
      suffix.endsWith('/role') ? 'USER_NOT_FOUND' : 'ADMINISTRATOR_NOT_FOUND',
    );
  }
});
test('last-super-admin conflicts are preserved and internal failures remain private', async (t) => {
  for (const error of [
    new AppError(409, 'LAST_SUPER_ADMIN', 'Keep an active super admin'),
    new Error('private-account-detail'),
  ]) {
    const fail = async () => {
      throw error;
    };
    const base = await start(t, {
      list: fail,
      findById: fail,
      updateRole: fail,
      updateStatus: fail,
    });
    const response = await fetch(base + '/' + user.id + '/role', {
      method: 'PATCH',
      headers,
      body: '{"role":"USER"}',
    });
    assert.equal(response.status, error instanceof AppError ? 409 : 500);
    assert.equal(
      JSON.stringify(await response.json()).includes('private-account-detail'),
      false,
    );
  }
});
test('staff management does not create passwords or delete accounts', async (t) => {
  const base = await start(t);
  for (const [method, path] of [
    ['POST', ''],
    ['DELETE', '/' + user.id],
    ['PATCH', '/' + user.id],
  ])
    assert.equal((await fetch(base + path, { method, headers })).status, 404);
});
