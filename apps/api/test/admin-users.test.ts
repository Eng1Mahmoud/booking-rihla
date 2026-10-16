import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createCatalogApp, adminFetch } from './helpers/catalogAuth.ts';
import type { AdminUserService } from '../src/services/adminUserService.ts';
const user = {
  id: randomUUID(),
  role: 'USER' as const,
  name: 'Passenger',
  email: 'passenger@example.test',
  phone: '+201012345678',
  language: 'ar',
  isActive: true,
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const empty: AdminUserService = {
  async list() {
    return [];
  },
  async findById() {
    return null;
  },
  async updateStatus() {
    return null;
  },
};
const json = { 'Content-Type': 'application/json' };
async function start(t: TestContext, service: AdminUserService = empty) {
  const server = createCatalogApp([], { adminUsers: service }).listen(
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
  return 'http://127.0.0.1:' + address.port + '/api/v1/admin/users';
}
test('user list filters normalize email and parse false explicitly with bounded pagination', async (t) => {
  let received: unknown;
  const base = await start(t, {
    ...empty,
    async list(input) {
      received = input;
      return [user];
    },
  });
  const params = new URLSearchParams({
    email: ' PASSENGER@EXAMPLE.TEST ',
    phone: user.phone,
    isActive: 'false',
    limit: '2',
    offset: '1',
  });
  const response = await adminFetch(base + '?' + params);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(received, {
    email: user.email,
    phone: user.phone,
    isActive: false,
    limit: 2,
    offset: 1,
  });
  assert.deepEqual(await response.json(), {
    data: [user],
    pagination: { limit: 2, offset: 1 },
  });
  await adminFetch(base);
  assert.deepEqual(received, { limit: 20, offset: 0 });
});
test('user read and status update forward only a valid target id and explicit boolean', async (t) => {
  let received: unknown;
  const base = await start(t, {
    ...empty,
    async findById(id) {
      assert.equal(id, user.id);
      return user;
    },
    async updateStatus(id, input) {
      received = { id, input };
      return { ...user, ...input };
    },
  });
  assert.deepEqual(await (await adminFetch(base + '/' + user.id)).json(), {
    data: user,
  });
  for (const isActive of [false, true]) {
    const response = await adminFetch(base + '/' + user.id + '/status', {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ isActive }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(received, { id: user.id, input: { isActive } });
    assert.equal((await response.json()).data.isActive, isActive);
  }
});
test('malformed user filters, repeated fields and unsupported privilege filters never reach the service', async (t) => {
  let calls = 0;
  const fail = async () => {
    calls++;
    throw new Error('not reached');
  };
  const base = await start(t, {
    list: fail,
    findById: fail,
    updateStatus: fail,
  });
  for (const query of [
    'email=invalid',
    'email=',
    'phone=201012345678',
    'phone=%2B0',
    'isActive=FALSE',
    'isActive=1',
    'isActive=',
    'limit=0',
    'limit=101',
    'offset=-1',
    'offset=100001',
    'limit=1&limit=2',
    'isActive=true&isActive=false',
    'role=ADMIN',
    'email[a]=x',
    'q=x',
  ])
    assert.equal((await adminFetch(base + '?' + query)).status, 400, query);
  for (const suffix of ['/invalid', '/' + user.id + '?extra=1'])
    assert.equal((await adminFetch(base + suffix)).status, 400);
  for (const body of [
    {},
    { isActive: 'false' },
    { isActive: 0 },
    { isActive: null },
    { isActive: false, role: 'ADMIN' },
    { isActive: true, email: 'new@example.test' },
    { isActive: false, id: user.id },
    { password: 'x' },
  ])
    assert.equal(
      (
        await adminFetch(base + '/' + user.id + '/status', {
          method: 'PATCH',
          headers: json,
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await adminFetch(base + '/' + user.id + '/status?x=1', {
        method: 'PATCH',
        headers: json,
        body: '{"isActive":false}',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await adminFetch(base + '/invalid/status', {
        method: 'PATCH',
        headers: json,
        body: '{"isActive":false}',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await adminFetch(base + '/' + user.id + '/status', {
        method: 'PATCH',
        body: 'text',
      })
    ).status,
    415,
  );
  assert.equal(calls, 0);
});
test('missing or protected account ids return the same safe 404 for detail and status', async (t) => {
  const base = await start(t);
  for (const [path, init] of [
    ['/' + user.id, {}],
    [
      '/' + user.id + '/status',
      { method: 'PATCH', headers: json, body: '{"isActive":false}' },
    ],
  ] as const) {
    const response = await adminFetch(base + path, init);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: { code: 'USER_NOT_FOUND', message: 'Passenger account not found' },
    });
  }
});
test('user management hides unexpected failures on list, detail and status', async (t) => {
  const fail = async () => {
    throw new Error('private-user-passwordHash-detail');
  };
  const base = await start(t, {
    list: fail,
    findById: fail,
    updateStatus: fail,
  });
  for (const [path, init] of [
    ['', {}],
    ['/' + user.id, {}],
    [
      '/' + user.id + '/status',
      { method: 'PATCH', headers: json, body: '{"isActive":false}' },
    ],
  ] as const) {
    const response = await adminFetch(base + path, init);
    assert.equal(response.status, 500);
    assert.equal(
      JSON.stringify(await response.json()).includes('private-user'),
      false,
    );
  }
});
test('user management does not expose account creation, deletion or unrestricted profile updates', async (t) => {
  const base = await start(t);
  for (const [method, path] of [
    ['POST', ''],
    ['DELETE', '/' + user.id],
    ['PATCH', '/' + user.id],
    ['PUT', '/' + user.id + '/status'],
  ])
    assert.equal((await adminFetch(base + path, { method })).status, 404);
});
