import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { signAccessToken } from '../../src/utils/sessionTokens.ts';
import { recordAudit } from '../../src/services/auditWriter.ts';
import { auditLogService } from '../../src/services/auditLogService.ts';

test('administrative HTTP changes persist safe atomic audit history, including batches, account roles and deleted entities', async (t) => {
  const scope = randomUUID(),
    ids = new Set<string>(),
    userIds: string[] = [];
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      // Scoped cleanup only; audit identifiers deliberately have no cascading FK.
      for (const id of ids) {
        await db.orm.public.Trip.where({ id }).delete();
      }
      for (const id of ids) {
        await db.orm.public.Bus.where({ id }).delete();
      }
      for (const id of ids) {
        await db.orm.public.Route.where({ id }).delete();
      }
      for (const id of ids) {
        await db.orm.public.Station.where({ id }).delete();
      }
      for (const id of ids) {
        await db.orm.public.City.where({ id }).delete();
        await db.orm.public.BusType.where({ id }).delete();
        await db.orm.public.Amenity.where({ id }).delete();
        await db.orm.public.AuditLog.where({ entityId: id }).deleteAll();
      }
      for (const id of userIds) {
        await db.orm.public.AuditLog.where({ entityId: id }).deleteAll();
        await db.orm.public.AuditLog.where({ actorId: id }).deleteAll();
        await db.orm.public.User.where({ id }).delete();
      }
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1';
  async function account(role: 'USER' | 'ADMIN' | 'SUPER_ADMIN') {
    const user = await db.orm.public.User.create({
      name: 'Audit test',
      email: randomUUID() + '@example.test',
      phone: '+201012345678',
      passwordHash: 'not-a-login-hash',
      role,
      emailVerifiedAt: new Date().toISOString(),
    });
    userIds.push(user.id);
    const session = await db.orm.public.Session.create({
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    return { user, token: await signAccessToken(user.id, session.id) };
  }
  const owner = await account('SUPER_ADMIN'),
    admin = await account('ADMIN'),
    passenger = await account('USER'),
    candidate = await account('USER');
  async function request(
    path: string,
    method = 'GET',
    body?: object,
    token = owner.token,
  ) {
    return fetch(base + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  async function create(path: string, body: object) {
    const r = await request(path, 'POST', body);
    assert.equal(r.status, 201, await r.clone().text());
    const data = (await r.json()).data;
    ids.add(data.id);
    return data;
  }
  async function update(path: string, body: object, token = owner.token) {
    const r = await request(path, 'PATCH', body, token);
    assert.equal(r.status, 200, await r.clone().text());
    return (await r.json()).data;
  }
  async function logs(id: string) {
    return await auditLogService.list({ entityId: id, limit: 100, offset: 0 });
  }
  const city = await create('/cities', {
      nameAr: 'مدينة',
      nameEn: 'Audit ' + scope,
    }),
    city2 = await create('/cities', {
      nameAr: 'مدينة ثانية',
      nameEn: 'Audit destination ' + scope,
    });
  await update(
    '/cities/' + city.id,
    { nameEn: 'Updated ' + scope },
    admin.token,
  );
  const count = (await logs(city.id)).length;
  await update('/cities/' + city.id, { nameEn: 'Updated ' + scope });
  assert.equal((await logs(city.id)).length, count);
  const station = await create('/stations', {
      cityId: city.id,
      nameAr: 'محطة',
      nameEn: 'Origin',
    }),
    destination = await create('/stations', {
      cityId: city2.id,
      nameAr: 'وصول',
      nameEn: 'Destination',
    });
  await update('/stations/' + station.id, { nameEn: 'Updated origin' });
  const route = await create('/routes', {
    originStationId: station.id,
    destinationStationId: destination.id,
    estimatedDurationMinutes: 60,
  });
  await update('/routes/' + route.id, { estimatedDurationMinutes: 90 });
  const type = await create('/bus-types', {
      code: 'A' + scope.replaceAll('-', '').slice(0, 20).toUpperCase(),
      nameAr: 'نوع',
      nameEn: 'Type',
    }),
    amenity = await create('/amenities', {
      code: 'A' + randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase(),
      nameAr: 'خدمة',
      nameEn: 'Amenity',
    });
  await update('/bus-types/' + type.id, { nameEn: 'Updated type' });
  await update('/amenities/' + amenity.id, { nameEn: 'Updated amenity' });
  const bus = await create('/buses', {
    plateNumber: 'AUDIT-' + scope.slice(0, 8),
    seatCount: 4,
    busTypeId: type.id,
    amenityIds: [amenity.id],
    seatLayout: 'STANDARD_2_2',
  });
  await update('/buses/' + bus.id, {
    plateNumber: 'UPDATED-' + scope.slice(0, 8),
  });
  const departureAt = new Date(Date.now() + 86400000 * 20).toISOString(),
    arrivalAt = new Date(Date.parse(departureAt) + 3600000).toISOString();
  const trip = await create('/trips', {
    routeId: route.id,
    busId: bus.id,
    departureAt,
    arrivalAt,
    pricePiastres: 10000,
  });
  await update('/trips/' + trip.id, { pricePiastres: 12000 });
  const failed = await request('/cities/' + city.id, 'DELETE');
  assert.equal(failed.status, 409);
  assert.equal((await logs(city.id)).length, count);
  await update(
    '/admin/users/' + passenger.user.id + '/status',
    { isActive: false },
    admin.token,
  );
  const userLog = (await logs(passenger.user.id))[0]!;
  assert.equal(userLog.actorId, admin.user.id);
  assert.deepEqual(userLog.before, { role: 'USER', isActive: true });
  assert.deepEqual(userLog.after, { role: 'USER', isActive: false });
  await update('/admin/admins/' + candidate.user.id + '/role', {
    role: 'ADMIN',
  });
  await update('/admin/admins/' + candidate.user.id + '/status', {
    isActive: false,
  });
  assert.equal((await logs(candidate.user.id)).length, 2);
  // Finite batch creates one entry per real departure; preview never creates history.
  const startDate = new Date(Date.now() + 86400000 * 30)
    .toISOString()
    .slice(0, 10);
  const batch = {
    routeId: route.id,
    busId: bus.id,
    startDate,
    endDate: startDate,
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    departureTime: '12:00',
    durationMinutes: 60,
    pricePiastres: 9000,
  };
  const initial = (
    await auditLogService.list({
      actorId: owner.user.id,
      entity: 'Trip',
      limit: 100,
      offset: 0,
    })
  ).length;
  assert.equal(
    (await request('/trips/batch/preview', 'POST', batch)).status,
    200,
  );
  assert.equal(
    (
      await auditLogService.list({
        actorId: owner.user.id,
        entity: 'Trip',
        limit: 100,
        offset: 0,
      })
    ).length,
    initial,
  );
  const createdBatch = await request('/trips/batch', 'POST', batch);
  assert.equal(createdBatch.status, 201);
  const batchTrips = (await createdBatch.json()).data.trips;
  for (const row of batchTrips) {
    ids.add(row.id);
    assert.equal((await logs(row.id)).length, 1);
  }
  assert.equal((await request('/trips/batch', 'POST', batch)).status, 409);
  for (const row of batchTrips) assert.equal((await logs(row.id)).length, 1);
  for (const [entity, id] of [
    ['City', city.id],
    ['Station', station.id],
    ['Route', route.id],
    ['Bus', bus.id],
    ['BusType', type.id],
    ['Amenity', amenity.id],
    ['Trip', trip.id],
  ]) {
    const rows = await logs(id);
    assert.ok(
      rows.some(
        (r) =>
          r.action === 'CREATE' &&
          r.entity === entity &&
          r.actorId === owner.user.id,
      ),
      entity,
    );
    assert.ok(
      rows.some((r) => r.action === 'UPDATE'),
      entity,
    );
  }
  // A failing audit insert aborts the enclosing business transaction.
  const rollbackId = randomUUID();
  ids.add(rollbackId);
  await assert.rejects(
    db.transaction(async (tx) => {
      const row = await tx.orm.public.City.create({
        id: rollbackId,
        nameAr: 'تراجع',
        nameEn: 'Rollback',
      });
      const broken = {
        ...tx,
        orm: {
          ...tx.orm,
          public: {
            ...tx.orm.public,
            AuditLog: {
              async create() {
                throw new Error('audit unavailable');
              },
            },
          },
        },
      };
      await recordAudit(
        broken as unknown as Parameters<typeof recordAudit>[0],
        { user: owner.user },
        'City',
        row.id,
        null,
        row,
      );
    }),
    /audit unavailable/,
  );
  assert.equal(
    await db.orm.public.City.where({ id: rollbackId }).first(),
    null,
  );
  assert.equal((await logs(rollbackId)).length, 0);
  // A later failure also rolls back an inserted audit row.
  await assert.rejects(
    db.transaction(async (tx) => {
      const row = await tx.orm.public.City.create({
        id: rollbackId,
        nameAr: 'تراجع',
        nameEn: 'Rollback',
      });
      await recordAudit(tx, { user: owner.user }, 'City', row.id, null, row);
      throw new Error('later failure');
    }),
    /later failure/,
  );
  assert.equal(
    await db.orm.public.City.where({ id: rollbackId }).first(),
    null,
  );
  assert.equal((await logs(rollbackId)).length, 0);
  for (const row of batchTrips)
    assert.equal((await request('/trips/' + row.id, 'DELETE')).status, 204);
  for (const [path, id] of [
    ['trips', trip.id],
    ['buses', bus.id],
    ['routes', route.id],
    ['stations', station.id],
    ['stations', destination.id],
    ['cities', city.id],
    ['cities', city2.id],
    ['bus-types', type.id],
    ['amenities', amenity.id],
  ])
    assert.equal((await request('/' + path + '/' + id, 'DELETE')).status, 204);
  const history = await logs(city.id);
  assert.equal(history.length, 3);
  assert.ok(history.some((r) => r.action === 'DELETE' && r.after === null));
  const row = history.find((r) => r.action === 'UPDATE')!;
  const detail = await request('/admin/audit-logs/' + row.id);
  assert.equal(detail.status, 200);
  assert.deepEqual((await detail.json()).data, row);
  const filtered = await request(
    '/admin/audit-logs?' +
      new URLSearchParams({
        actorId: admin.user.id,
        entity: 'City',
        entityId: city.id,
        action: 'UPDATE',
        from: '2000-01-01T00:00:00Z',
        to: '9998-01-01T00:00:00Z',
        limit: '1',
        offset: '0',
      }),
  );
  assert.equal(filtered.status, 200);
  assert.deepEqual((await filtered.json()).data, [row]);
  assert.equal(
    (
      await request(
        '/admin/audit-logs?entityId=' + city.id + '&limit=1&offset=1',
      )
    ).status,
    200,
  );
  const encoded = JSON.stringify(
    await auditLogService.list({
      actorId: owner.user.id,
      limit: 100,
      offset: 0,
    }),
  );
  for (const secret of [
    'passwordHash',
    'not-a-login-hash',
    owner.token,
    'emailVerifiedAt',
    'encryptedCode',
  ])
    assert.ok(!encoded.includes(secret));
});
