import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { hash, argon2id } from 'argon2';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { adminUserService } from '../../src/services/adminUserService.ts';
import { sessionService } from '../../src/services/sessionService.ts';
import { bookingService } from '../../src/services/bookingService.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import type { UserRole } from '../../src/schemas/authSchema.ts';
import { AppError } from '../../src/errors/AppError.ts';

test('passenger management safely suspends every session, preserves bookings and serializes with login, refresh and reservations', async (t) => {
  const namespace = 'users-' + randomUUID(),
    data = buildDemoData('2099-01-01', namespace),
    users: string[] = [];
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const trip of data.trips)
        await db.orm.public.Booking.where({ tripId: trip.id }).deleteAll();
      for (const id of users) await db.orm.public.User.where({ id }).delete();
      for (const trip of data.trips)
        await db.orm.public.Trip.where({ id: trip.id }).delete();
      for (const route of data.routes)
        await db.orm.public.Route.where({ id: route.id }).delete();
      for (const bus of data.buses)
        await db.orm.public.Bus.where({ id: bus.id }).delete();
      for (const station of data.stations)
        await db.orm.public.Station.where({ id: station.id }).delete();
      for (const city of data.cities)
        await db.orm.public.City.where({ id: city.id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1';
  await seedDemo('2099-01-01', namespace);
  const password = 'User-management-password-2026',
    passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  const phone = '+201' + randomInt(100000000, 999999999);
  async function account(
    label: string,
    role: UserRole = 'USER',
    verified = true,
    isActive = true,
  ) {
    const user = await db.orm.public.User.create({
      name: 'Managed ' + label,
      email: namespace + '-' + label + '@example.test',
      phone,
      passwordHash,
      role,
      emailVerifiedAt: verified ? '2026-01-01T00:00:00Z' : null,
      isActive,
      createdAt: '2026-01-01T00:00:00Z',
    });
    users.push(user.id);
    return user;
  }
  const passenger = await account('passenger'),
    pending = await account('pending', 'USER', false, false),
    admin = await account('admin', 'ADMIN'),
    superAdmin = await account('super', 'SUPER_ADMIN');
  const json = { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' };
  const login = (email: string) =>
    fetch(base + '/auth/login', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ email, password }),
    });
  async function signedIn(email: string) {
    const response = await login(email);
    assert.equal(response.status, 200);
    return {
      token: (await response.json()).data.accessToken as string,
      cookie: response.headers.get('set-cookie')!.split(';')[0]!,
    };
  }
  const operator = await signedIn(admin.email),
    superOperator = await signedIn(superAdmin.email),
    deviceOne = await signedIn(passenger.email),
    deviceTwo = await signedIn(passenger.email);
  const bearer = (token: string) => ({ Authorization: 'Bearer ' + token });
  const endpoint = '/admin/users';
  const read = (path: string, token = operator.token) =>
    fetch(base + path, { headers: bearer(token) });
  const status = (id: string, isActive: boolean, token = operator.token) =>
    fetch(base + endpoint + '/' + id + '/status', {
      method: 'PATCH',
      headers: { ...json, ...bearer(token) },
      body: JSON.stringify({ isActive }),
    });
  const me = (token: string) => read('/auth/me', token);
  const refresh = (cookie: string) =>
    fetch(base + '/auth/refresh', {
      method: 'POST',
      headers: { ...json, Cookie: cookie },
      body: '{}',
    });
  for (const [method, path] of [
    ['GET', endpoint],
    ['GET', endpoint + '/' + passenger.id],
    ['PATCH', endpoint + '/' + passenger.id + '/status'],
  ]) {
    for (const token of ['', deviceOne.token])
      assert.equal(
        (
          await fetch(base + path, {
            method,
            headers: { ...json, ...(token ? bearer(token) : {}) },
            ...(method === 'PATCH' ? { body: '{"isActive":false}' } : {}),
          })
        ).status,
        token ? 403 : 401,
      );
  }
  const params = new URLSearchParams({ phone });
  const listed = await read(endpoint + '?' + params);
  assert.equal(listed.status, 200);
  assert.equal(listed.headers.get('cache-control'), 'no-store');
  const list = (await listed.json()).data;
  assert.deepEqual(
    list.map((u: { id: string }) => u.id),
    [passenger.id, pending.id].sort().reverse(),
  );
  const safeFields = [
    'id',
    'name',
    'email',
    'phone',
    'role',
    'language',
    'isActive',
    'emailVerifiedAt',
    'createdAt',
  ].sort();
  assert.deepEqual(Object.keys(list[0]).sort(), safeFields);
  for (const word of [
    'passwordHash',
    'sessions',
    'tokens',
    'loginFailures',
    'lockedUntil',
    'codeHash',
  ])
    assert.equal(JSON.stringify(list).includes(word), false, word);
  const normalized = new URLSearchParams({
    email: ' ' + passenger.email.toUpperCase() + ' ',
    phone,
    isActive: 'true',
  });
  assert.deepEqual(
    (await (await read(endpoint + '?' + normalized)).json()).data.map(
      (u: { id: string }) => u.id,
    ),
    [passenger.id],
  );
  assert.deepEqual(
    (
      await (await read(endpoint + '?' + params + '&isActive=false')).json()
    ).data.map((u: { id: string }) => u.id),
    [pending.id],
  );
  const paged = await (
    await read(endpoint + '?' + params + '&limit=1&offset=1')
  ).json();
  assert.deepEqual(paged.data, [list[1]]);
  assert.deepEqual(paged.pagination, { limit: 1, offset: 1 });
  assert.deepEqual(
    (await (await read(endpoint + '?email=nobody@example.test')).json()).data,
    [],
  );
  assert.equal(
    (await read(endpoint + '/' + passenger.id, superOperator.token)).status,
    200,
  );
  for (const target of [admin, superAdmin]) {
    assert.equal((await read(endpoint + '/' + target.id)).status, 404);
    assert.equal((await status(target.id, false)).status, 404);
    assert.equal(
      (await status(target.id, false, superOperator.token)).status,
      404,
    );
    assert.equal(
      (await db.orm.public.User.where({ id: target.id }).first())!.isActive,
      true,
    );
  }
  assert.equal((await status(randomUUID(), false)).status, 404);
  const trip = data.trips[0]!,
    seats = data.seats
      .filter((seat) => seat.busId === trip.busId)
      .sort((a, b) => a.number - b.number);
  const auth = await sessionService.authenticateAccessToken(deviceOne.token);
  const booking = await bookingService.create(auth, {
    tripId: trip.id,
    contactPhone: phone,
    passengers: [{ seatId: seats[0]!.id, name: 'Preserved passenger' }],
  });
  const beforeBooking = await db.orm.public.Booking.where({
    id: booking.id,
  }).first();
  const beforeSeats = await db.orm.public.BookingSeat.where({
    bookingId: booking.id,
  }).all();
  const suspended = await status(passenger.id, false);
  assert.equal(suspended.status, 200);
  assert.equal((await suspended.json()).data.isActive, false);
  const revoked = await db.orm.public.Session.where({
    userId: passenger.id,
  }).all();
  assert.equal(revoked.length, 2);
  assert.ok(revoked.every((session) => session.revokedAt));
  for (const device of [deviceOne, deviceTwo]) {
    assert.equal((await me(device.token)).status, 401);
    assert.equal((await refresh(device.cookie)).status, 401);
  }
  const denied = await login(passenger.email);
  assert.equal(denied.status, 401);
  assert.equal((await denied.json()).error.code, 'INVALID_CREDENTIALS');
  assert.equal((await status(passenger.id, false)).status, 200);
  assert.deepEqual(
    await db.orm.public.Session.where({ userId: passenger.id }).all(),
    revoked,
  );
  assert.deepEqual(
    await db.orm.public.Booking.where({ id: booking.id }).first(),
    beforeBooking,
  );
  assert.deepEqual(
    await db.orm.public.BookingSeat.where({ bookingId: booking.id }).all(),
    beforeSeats,
  );
  assert.equal((await read('/admin/bookings/' + booking.id)).status, 200);
  const available = await (
    await fetch(base + '/trips/' + trip.id + '/seats')
  ).json();
  assert.equal(
    available.data.seats.find((s: { id: string }) => s.id === seats[0]!.id)
      .isAvailable,
    false,
  );
  assert.equal(
    (await status(passenger.id, true, superOperator.token)).status,
    200,
  );
  for (const device of [deviceOne, deviceTwo]) {
    assert.equal((await me(device.token)).status, 401);
    assert.equal((await refresh(device.cookie)).status, 401);
  }
  const newDevice = await signedIn(passenger.email);
  assert.equal((await me(newDevice.token)).status, 200);
  assert.equal(
    (await read('/bookings/' + booking.id, newDevice.token)).status,
    200,
  );
  assert.equal((await status(passenger.id, true)).status, 200);
  assert.equal((await me(newDevice.token)).status, 200);
  // Activation is separate from email verification and does not clear login lockouts/passwords.
  await db.orm.public.User.where({ id: pending.id }).update({
    loginFailures: 2,
  });
  assert.equal((await status(pending.id, true)).status, 200);
  const pendingRow = await db.orm.public.User.where({ id: pending.id }).first();
  assert.equal(pendingRow!.emailVerifiedAt, null);
  assert.equal(pendingRow!.loginFailures, 2);
  assert.equal(pendingRow!.passwordHash, passwordHash);
  assert.equal((await login(pending.email)).status, 401);
  // Login and suspension serialize on the same account/email lock.
  const racer = await account('race');
  const [loggingIn, turningOff] = await Promise.allSettled([
    sessionService.login({ email: racer.email, password }),
    adminUserService.updateStatus(racer.id, { isActive: false }),
  ]);
  assert.equal(turningOff.status, 'fulfilled');
  assert.equal(
    (await db.orm.public.User.where({ id: racer.id }).first())!.isActive,
    false,
  );
  assert.equal(
    (
      await db.orm.public.Session.where({
        userId: racer.id,
        revokedAt: null,
      }).all()
    ).length,
    0,
  );
  if (loggingIn.status === 'fulfilled')
    await assert.rejects(
      sessionService.authenticateAccessToken(loggingIn.value.accessToken),
      (e) => e instanceof AppError && e.code === 'UNAUTHENTICATED',
    );
  else
    assert.ok(
      loggingIn.reason instanceof AppError &&
        loggingIn.reason.code === 'INVALID_CREDENTIALS',
    );
  await adminUserService.updateStatus(racer.id, { isActive: true });
  const tokens = await sessionService.login({ email: racer.email, password });
  const [rotating, offAgain] = await Promise.allSettled([
    sessionService.refresh(tokens.refreshToken),
    adminUserService.updateStatus(racer.id, { isActive: false }),
  ]);
  assert.equal(offAgain.status, 'fulfilled');
  assert.equal(
    (
      await db.orm.public.Session.where({
        userId: racer.id,
        revokedAt: null,
      }).all()
    ).length,
    0,
  );
  await adminUserService.updateStatus(racer.id, { isActive: true });
  await assert.rejects(
    sessionService.refresh(tokens.refreshToken),
    (e) => e instanceof AppError && e.code === 'UNAUTHENTICATED',
  );
  if (rotating.status === 'fulfilled')
    await assert.rejects(
      sessionService.authenticateAccessToken(rotating.value.accessToken),
      (e) => e instanceof AppError && e.code === 'UNAUTHENTICATED',
    );
  else
    assert.ok(
      rotating.reason instanceof AppError &&
        rotating.reason.code === 'UNAUTHENTICATED',
    );
  // A reservation finishes before suspension or rejects after it; no allocation is silently released.
  const newAuth = await sessionService.authenticateAccessToken(newDevice.token);
  const [reserving, finalOff] = await Promise.allSettled([
    bookingService.create(newAuth, {
      tripId: trip.id,
      contactPhone: phone,
      passengers: [{ seatId: seats[1]!.id, name: 'Racing passenger' }],
    }),
    adminUserService.updateStatus(passenger.id, { isActive: false }),
  ]);
  assert.equal(finalOff.status, 'fulfilled');
  assert.equal(
    (
      await db.orm.public.Session.where({
        userId: passenger.id,
        revokedAt: null,
      }).all()
    ).length,
    0,
  );
  if (reserving.status === 'rejected')
    assert.ok(
      reserving.reason instanceof AppError &&
        reserving.reason.code === 'UNAUTHENTICATED',
    );
  else
    assert.ok(
      await db.orm.public.Booking.where({ id: reserving.value.id }).first(),
    );
  assert.deepEqual(
    await db.orm.public.BookingSeat.where({ bookingId: booking.id }).all(),
    beforeSeats,
  );
  // Current administrative role is checked for every request, even with an old JWT.
  await db.orm.public.User.where({ id: admin.id }).update({ role: 'USER' });
  assert.equal((await read(endpoint)).status, 403);
  assert.equal((await status(racer.id, false)).status, 403);
  assert.equal(
    (await read(endpoint + '/' + racer.id, superOperator.token)).status,
    200,
  );
});
