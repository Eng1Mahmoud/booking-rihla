import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { hash, argon2id } from 'argon2';
import { decodeJwt } from 'jose';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { bootstrapSuperAdmin } from '../../src/services/adminBootstrapService.ts';
import { authService } from '../../src/services/authService.ts';
import { decryptVerificationCode } from '../../src/utils/authCrypto.ts';
import type { UserRole } from '../../src/schemas/authSchema.ts';
import { AppError } from '../../src/errors/AppError.ts';
import { isCheckViolation } from '../../src/utils/databaseErrors.ts';

test('database roles enforce catalog access, live demotion/suspension and safe first-super-admin bootstrap', async (t) => {
  const server = createApp([]).listen(0, '127.0.0.1');
  const users: string[] = [],
    cities: string[] = [];
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      for (const id of cities) await db.orm.public.City.where({ id }).delete();
      for (const id of users) await db.orm.public.User.where({ id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1';
  const password = 'Authorization-password-2026',
    passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  const existingSuper = await db.orm.public.User.where({
    role: 'SUPER_ADMIN',
  }).first();
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Protection': '1',
  };
  const post = (path: string, body: object) =>
    fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) });
  async function account(
    label: string,
    role: UserRole = 'USER',
    verified = true,
    isActive = true,
  ) {
    const user = await db.orm.public.User.create({
      name: 'Authorization ' + label,
      email: 'authorization-' + label + '-' + randomUUID() + '@example.test',
      phone: '+201012345678',
      passwordHash,
      role,
      emailVerifiedAt: verified ? new Date().toISOString() : null,
      isActive,
    });
    users.push(user.id);
    return user;
  }
  async function login(email: string) {
    const response = await post('/auth/login', { email, password });
    assert.equal(response.status, 200);
    return {
      data: (await response.json()).data,
      cookie: response.headers.get('set-cookie')!.split(';')[0]!,
    };
  }
  async function get(path: string, token?: string) {
    return await fetch(base + path, {
      headers: token ? { Authorization: 'Bearer ' + token } : {},
    });
  }
  async function rejection(promise: Promise<unknown>, code: string) {
    await assert.rejects(
      promise,
      (error) => error instanceof AppError && error.code === code,
    );
  }
  // Public registration cannot supply a role and the database default is USER.
  const email = 'authorization-passenger-' + randomUUID() + '@example.test';
  assert.equal(
    (
      await post('/auth/register', {
        name: 'Passenger',
        email,
        phone: '+201012345678',
        password,
        role: 'SUPER_ADMIN',
      })
    ).status,
    400,
  );
  assert.equal(await db.orm.public.User.where({ email }).first(), null);
  const signup = await post('/auth/register', {
    name: 'Passenger',
    email,
    phone: '+201012345678',
    password,
  });
  assert.equal(signup.status, 202);
  const receipt = await signup.json();
  const passenger = await db.orm.public.User.where({ email }).first();
  assert.ok(passenger);
  users.push(passenger.id);
  assert.equal(passenger.role, 'USER');
  const verification = await db.orm.public.EmailOutbox.where({
    userId: passenger.id,
    purpose: 'VERIFY_EMAIL',
  }).first();
  assert.ok(verification?.encryptedCode);
  await authService.verifyEmail({
    email,
    verificationId: receipt.verificationId,
    code: decryptVerificationCode(passenger.id, verification.encryptedCode),
  });
  const normal = await login(email);
  assert.equal(normal.data.user.role, 'USER');
  assert.equal('role' in decodeJwt(normal.data.accessToken), false);
  const pending = await account('pending', 'USER', false),
    inactive = await account('inactive', 'USER', true, false);
  const first = await account('first'),
    second = await account('second');
  const firstLogin = await login(first.email),
    secondLogin = await login(second.email);
  let superUser: typeof first;
  if (!existingSuper) {
    await rejection(
      bootstrapSuperAdmin('absent-' + randomUUID() + '@example.test'),
      'BOOTSTRAP_ACCOUNT_REQUIRED',
    );
    await rejection(
      bootstrapSuperAdmin(pending.email),
      'BOOTSTRAP_ACCOUNT_REQUIRED',
    );
    await rejection(
      bootstrapSuperAdmin(inactive.email),
      'BOOTSTRAP_ACCOUNT_REQUIRED',
    );
    const races = await Promise.allSettled([
      bootstrapSuperAdmin(first.email),
      bootstrapSuperAdmin(second.email),
    ]);
    assert.equal(races.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(
      races.filter(
        (r) =>
          r.status === 'rejected' &&
          r.reason instanceof AppError &&
          r.reason.code === 'BOOTSTRAP_COMPLETED',
      ).length,
      1,
    );
    superUser =
      (await db.orm.public.User.where({ id: first.id }).first())?.role ===
      'SUPER_ADMIN'
        ? first
        : second;
    const old = superUser.id === first.id ? firstLogin : secondLogin;
    assert.equal((await get('/auth/me', old.data.accessToken)).status, 401);
    const repeated = await bootstrapSuperAdmin(
      ' ' + superUser.email.toUpperCase() + ' ',
    );
    assert.equal(repeated.changed, false);
    await rejection(
      bootstrapSuperAdmin(passenger.email),
      'BOOTSTRAP_COMPLETED',
    );
  } else {
    // Never change or delete an existing operator's super-admin account.
    await rejection(bootstrapSuperAdmin(first.email), 'BOOTSTRAP_COMPLETED');
    superUser = await account('super-fixture', 'SUPER_ADMIN');
  }
  const admin = await account('admin', 'ADMIN'),
    adminLogin = await login(admin.email),
    superLogin = await login(superUser.email);
  assert.equal(adminLogin.data.user.role, 'ADMIN');
  assert.equal(superLogin.data.user.role, 'SUPER_ADMIN');
  const paths = ['/buses', '/routes', '/trips'];
  for (const path of paths) {
    assert.equal((await get(path)).status, 401);
    assert.equal((await get(path, normal.data.accessToken)).status, 403);
    assert.equal((await get(path, adminLogin.data.accessToken)).status, 200);
    assert.equal((await get(path, superLogin.data.accessToken)).status, 200);
  }
  for (const token of [
    adminLogin.data.accessToken,
    superLogin.data.accessToken,
  ]) {
    const created = await fetch(base + '/cities', {
      method: 'POST',
      headers: { ...headers, Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        nameAr: 'اختبار صلاحيات',
        nameEn: 'Authorization ' + randomUUID(),
      }),
    });
    assert.equal(created.status, 201);
    const city = (await created.json()).data;
    cities.push(city.id);
    const denied = await fetch(base + '/cities/' + city.id, {
      method: 'PATCH',
      headers: {
        ...headers,
        Authorization: 'Bearer ' + normal.data.accessToken,
      },
      body: JSON.stringify({ nameEn: 'Not allowed' }),
    });
    assert.equal(denied.status, 403);
    assert.notEqual(
      (await db.orm.public.City.where({ id: city.id }).first())?.nameEn,
      'Not allowed',
    );
    assert.equal(
      (
        await fetch(base + '/cities/' + city.id, {
          method: 'PATCH',
          headers: { ...headers, Authorization: 'Bearer ' + token },
          body: JSON.stringify({ nameEn: 'Authorized edit' }),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(base + '/cities/' + city.id, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        })
      ).status,
      204,
    );
  }
  // Authorization uses current DB state; changing a role needs no JWT expiry wait.
  await db.orm.public.User.where({ id: admin.id }).update({ role: 'USER' });
  assert.equal((await get('/buses', adminLogin.data.accessToken)).status, 403);
  const me = await get('/auth/me', adminLogin.data.accessToken);
  assert.equal(me.status, 200);
  assert.equal((await me.json()).data.role, 'USER');
  const refreshed = await fetch(base + '/auth/refresh', {
    method: 'POST',
    headers: { ...headers, Cookie: adminLogin.cookie },
    body: '{}',
  });
  assert.equal(refreshed.status, 200);
  assert.equal((await refreshed.json()).data.user.role, 'USER');
  await db.orm.public.User.where({ id: admin.id }).update({
    role: 'ADMIN',
    isActive: false,
  });
  assert.equal((await get('/buses', adminLogin.data.accessToken)).status, 401);
  await db.orm.public.User.where({ id: admin.id }).update({
    isActive: true,
    emailVerifiedAt: null,
  });
  assert.equal((await get('/buses', adminLogin.data.accessToken)).status, 401);
  await db.orm.public.User.where({ id: admin.id }).update({
    emailVerifiedAt: new Date().toISOString(),
  });
  assert.equal((await get('/buses', adminLogin.data.accessToken)).status, 200);
  const logout = await fetch(base + '/auth/logout-all', {
    method: 'POST',
    headers: {
      ...headers,
      Authorization: 'Bearer ' + adminLogin.data.accessToken,
    },
    body: '{}',
  });
  assert.equal(logout.status, 204);
  assert.equal((await get('/buses', adminLogin.data.accessToken)).status, 401);
  for (const path of ['/cities', '/stations'])
    assert.equal((await get(path)).status, 200);
  await assert.rejects(
    db.orm.public.User.where({ id: passenger.id }).update({
      role: 'OWNER' as UserRole,
    }),
    (error) => isCheckViolation(error, 'User_role_check_a8bee70d'),
  );
  assert.equal(
    (await db.orm.public.User.where({ id: passenger.id }).first())?.role,
    'USER',
  );
});
