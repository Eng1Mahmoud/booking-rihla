import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { hash, argon2id } from 'argon2';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { bootstrapSuperAdmin } from '../../src/services/adminBootstrapService.ts';
import { sessionService } from '../../src/services/sessionService.ts';
import { administratorService } from '../../src/services/administratorService.ts';
import type { UserRole } from '../../src/schemas/authSchema.ts';
import { AppError } from '../../src/errors/AppError.ts';

test('super-admin management revokes changed roles, rejects stale actors and preserves the last usable super admin under races', async (t) => {
  const users: string[] = [];
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      for (const id of users) await db.orm.public.User.where({ id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1',
    endpoint = '/admin/admins';
  const originalSupers = await db.orm.public.User.where({
    role: 'SUPER_ADMIN',
  }).all();
  const hasOriginalUsable = originalSupers.some(
    (u) => u.isActive && u.emailVerifiedAt,
  );
  const password = 'Administrator-management-password-2026',
    passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  async function account(
    label: string,
    role: UserRole = 'USER',
    verified = true,
    isActive = true,
  ) {
    const user = await db.orm.public.User.create({
      name: 'Staff test ' + label,
      email: 'staff-' + label + '-' + randomUUID() + '@example.test',
      phone: '+201012345678',
      passwordHash,
      role,
      emailVerifiedAt: verified ? new Date().toISOString() : null,
      isActive,
      createdAt: '2026-01-01T00:00:00Z',
    });
    users.push(user.id);
    return user;
  }
  const first = await account(
    'first',
    originalSupers.length ? 'SUPER_ADMIN' : 'USER',
  );
  if (!originalSupers.length) await bootstrapSuperAdmin(first.email);
  const candidate = await account('candidate'),
    ordinary = await account('ordinary', 'ADMIN'),
    pending = await account('pending', 'USER', false),
    inactive = await account('inactive', 'USER', true, false);
  const json = { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' };
  async function signIn(user: typeof first) {
    const response = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ email: user.email, password }),
    });
    assert.equal(response.status, 200);
    const token = (await response.json()).data.accessToken as string;
    return {
      user,
      token,
      cookie: response.headers.get('set-cookie')!.split(';')[0]!,
      auth: await sessionService.authenticateAccessToken(token),
    };
  }
  let owner = await signIn(first);
  const oldCandidate = await signIn(candidate),
    normal = await signIn(ordinary);
  const bearer = (token: string) => ({ Authorization: 'Bearer ' + token });
  const get = (path: string, token = owner.token) =>
    fetch(base + path, { headers: bearer(token) });
  const role = (id: string, value: UserRole, token = owner.token) =>
    fetch(base + endpoint + '/' + id + '/role', {
      method: 'PATCH',
      headers: { ...json, ...bearer(token) },
      body: JSON.stringify({ role: value }),
    });
  const status = (id: string, isActive: boolean, token = owner.token) =>
    fetch(base + endpoint + '/' + id + '/status', {
      method: 'PATCH',
      headers: { ...json, ...bearer(token) },
      body: JSON.stringify({ isActive }),
    });
  async function error(response: Response, statusCode: number, code: string) {
    assert.equal(response.status, statusCode);
    assert.equal((await response.json()).error.code, code);
  }
  async function freshRole(id: string) {
    const user = await db.orm.public.User.where({ id }).first();
    assert.ok(user);
    return user;
  }
  for (const token of ['', oldCandidate.token, normal.token])
    for (const [method, suffix] of [
      ['GET', ''],
      ['GET', '/' + first.id],
      ['PATCH', '/' + candidate.id + '/role'],
      ['PATCH', '/' + first.id + '/status'],
    ]) {
      const response = await fetch(base + endpoint + suffix, {
        method,
        headers: { ...json, ...(token ? bearer(token) : {}) },
        ...(method === 'PATCH' ? { body: '{}' } : {}),
      });
      assert.equal(response.status, token ? 403 : 401);
    }
  const initial = await get(endpoint);
  assert.equal(initial.status, 200);
  assert.equal(initial.headers.get('cache-control'), 'no-store');
  assert.ok(
    (await initial.json()).data.every(
      (u: { role: string }) => u.role !== 'USER',
    ),
  );
  const detail = (await (await get(endpoint + '/' + first.id)).json()).data;
  assert.deepEqual(
    Object.keys(detail).sort(),
    [
      'id',
      'name',
      'email',
      'phone',
      'role',
      'language',
      'isActive',
      'emailVerifiedAt',
      'createdAt',
    ].sort(),
  );
  for (const word of [
    'passwordHash',
    'tokens',
    'sessions',
    'loginFailures',
    'lockedUntil',
  ])
    assert.equal(JSON.stringify(detail).includes(word), false);
  await error(
    await get(endpoint + '/' + candidate.id),
    404,
    'ADMINISTRATOR_NOT_FOUND',
  );
  await error(
    await status(candidate.id, false),
    404,
    'ADMINISTRATOR_NOT_FOUND',
  );
  await error(await role(randomUUID(), 'ADMIN'), 404, 'USER_NOT_FOUND');
  for (const target of [pending, inactive]) {
    await error(await role(target.id, 'ADMIN'), 409, 'ACCOUNT_NOT_READY');
    assert.equal((await freshRole(target.id)).role, 'USER');
  }
  // Inactive or unverified backup accounts do not satisfy the last-super-admin guard.
  const inactiveBackup = await account(
      'inactive-super',
      'SUPER_ADMIN',
      true,
      false,
    ),
    unverifiedBackup = await account(
      'unverified-super',
      'SUPER_ADMIN',
      false,
      true,
    );
  if (!hasOriginalUsable) {
    for (const next of ['USER', 'ADMIN'] as const)
      await error(await role(first.id, next), 409, 'LAST_SUPER_ADMIN');
    await error(await status(first.id, false), 409, 'LAST_SUPER_ADMIN');
  }
  assert.equal((await role(first.id, 'SUPER_ADMIN')).status, 200);
  assert.equal((await status(first.id, true)).status, 200);
  assert.equal((await get('/auth/me', owner.token)).status, 200);
  const promoted = await role(candidate.id, 'ADMIN');
  assert.equal(promoted.status, 200);
  assert.equal((await promoted.json()).data.role, 'ADMIN');
  assert.equal((await get('/auth/me', oldCandidate.token)).status, 401);
  const oldRefresh = await fetch(base + '/auth/refresh', {
    method: 'POST',
    headers: { ...json, Cookie: oldCandidate.cookie },
    body: '{}',
  });
  assert.equal(oldRefresh.status, 401);
  assert.equal((await freshRole(candidate.id)).passwordHash, passwordHash);
  const adminCandidate = await signIn(candidate);
  assert.equal(adminCandidate.auth.user.role, 'ADMIN');
  assert.equal((await get(endpoint, adminCandidate.token)).status, 403);
  assert.equal((await role(candidate.id, 'ADMIN')).status, 200);
  assert.equal((await get('/auth/me', adminCandidate.token)).status, 200);
  const filters = new URLSearchParams({
    email: ' ' + candidate.email.toUpperCase() + ' ',
    role: 'ADMIN',
    isActive: 'true',
  });
  assert.deepEqual(
    (await (await get(endpoint + '?' + filters)).json()).data.map(
      (u: { id: string }) => u.id,
    ),
    [candidate.id],
  );
  assert.deepEqual(
    (await (await get('/admin/users?email=' + candidate.email)).json()).data,
    [],
  );
  assert.equal(
    (
      await fetch(base + '/admin/users/' + candidate.id + '/status', {
        method: 'PATCH',
        headers: { ...json, ...bearer(owner.token) },
        body: '{"isActive":false}',
      })
    ).status,
    404,
  );
  const sorted = (await (await get(endpoint + '?limit=100')).json()).data as {
    id: string;
    createdAt: string;
  }[];
  const page = await (await get(endpoint + '?limit=1&offset=1')).json();
  assert.deepEqual(page.data, [sorted[1]]);
  assert.deepEqual(page.pagination, { limit: 1, offset: 1 });
  assert.equal((await role(candidate.id, 'SUPER_ADMIN')).status, 200);
  assert.equal((await get('/auth/me', adminCandidate.token)).status, 401);
  let peer = await signIn(candidate);
  if (!hasOriginalUsable) {
    // Concurrent self-demotions leave exactly one qualified super admin.
    const self = await Promise.all([
      role(owner.user.id, 'USER', owner.token),
      role(peer.user.id, 'USER', peer.token),
    ]);
    assert.deepEqual(self.map((r) => r.status).sort(), [200, 409]);
    if (self[0]!.status === 200) [owner, peer] = [peer, owner];
    assert.equal((await get('/auth/me', peer.token)).status, 401);
    assert.equal((await role(peer.user.id, 'SUPER_ADMIN')).status, 200);
    peer = await signIn(peer.user);
    // When super admins demote one another, the waiting request must recheck its own authority.
    const cross = await Promise.all([
      role(peer.user.id, 'USER', owner.token),
      role(owner.user.id, 'USER', peer.token),
    ]);
    assert.equal(cross.filter((r) => r.status === 200).length, 1);
    assert.ok(cross.every((r) => [200, 401, 403].includes(r.status)));
    if (cross[1]!.status === 200) [owner, peer] = [peer, owner];
    await assert.rejects(
      administratorService.updateRole(peer.auth, owner.user.id, {
        role: 'USER',
      }),
      (e) =>
        e instanceof AppError &&
        ['UNAUTHENTICATED', 'FORBIDDEN'].includes(e.code),
    );
    assert.equal((await role(peer.user.id, 'SUPER_ADMIN')).status, 200);
    peer = await signIn(peer.user);
    // Concurrent suspensions also retain one active verified super admin.
    const off = await Promise.all([
      status(owner.user.id, false, owner.token),
      status(peer.user.id, false, peer.token),
    ]);
    assert.deepEqual(off.map((r) => r.status).sort(), [200, 409]);
    if (off[0]!.status === 200) [owner, peer] = [peer, owner];
    assert.equal((await get('/auth/me', peer.token)).status, 401);
    assert.equal((await status(peer.user.id, true)).status, 200);
    assert.equal((await get('/auth/me', peer.token)).status, 401);
    // Keep the inactive peer to verify protection against non-usable backups once more.
    assert.equal((await status(peer.user.id, false)).status, 200);
    await error(await role(owner.user.id, 'USER'), 409, 'LAST_SUPER_ADMIN');
  }
  // Staff suspension revokes every device; reactivation cannot revive old credentials.
  const normalTwo = await signIn(ordinary);
  assert.equal((await status(ordinary.id, false)).status, 200);
  assert.equal((await get('/auth/me', normal.token)).status, 401);
  assert.equal((await get('/auth/me', normalTwo.token)).status, 401);
  const revoked = await db.orm.public.Session.where({
    userId: ordinary.id,
  }).all();
  assert.ok(revoked.every((s) => s.revokedAt));
  assert.equal((await status(ordinary.id, false)).status, 200);
  assert.deepEqual(
    await db.orm.public.Session.where({ userId: ordinary.id }).all(),
    revoked,
  );
  assert.equal((await status(ordinary.id, true)).status, 200);
  assert.equal((await get('/auth/me', normal.token)).status, 401);
  const reactivated = await signIn(ordinary);
  assert.equal((await get('/buses', reactivated.token)).status, 200);
  assert.equal((await get(endpoint, reactivated.token)).status, 403);
  assert.equal((await role(ordinary.id, 'USER')).status, 200);
  assert.equal((await get('/auth/me', reactivated.token)).status, 401);
  assert.equal((await get(endpoint + '/' + ordinary.id)).status, 404);
  assert.equal((await get('/admin/users/' + ordinary.id)).status, 200);
  // A passenger suspension racing promotion cannot result in an inactive newly promoted admin.
  const racing = await account('racing');
  const raced = await Promise.all([
    role(racing.id, 'ADMIN'),
    fetch(base + '/admin/users/' + racing.id + '/status', {
      method: 'PATCH',
      headers: { ...json, ...bearer(owner.token) },
      body: '{"isActive":false}',
    }),
  ]);
  const after = await freshRole(racing.id);
  assert.ok(
    (after.role === 'ADMIN' && after.isActive) ||
      (after.role === 'USER' && !after.isActive),
  );
  assert.deepEqual(
    raced.map((r) => r.status),
    after.role === 'ADMIN' ? [200, 404] : [409, 200],
  );
  assert.equal((await freshRole(inactiveBackup.id)).isActive, false);
  assert.equal((await freshRole(unverifiedBackup.id)).emailVerifiedAt, null);
  assert.equal((await get(endpoint + '?role=USER')).status, 400);
});
