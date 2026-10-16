import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import {
  sessionService,
  type SessionService,
} from '../src/services/sessionService.ts';
import { busService } from '../src/services/busService.ts';
import type { BusTypeService } from '../src/services/busTypeService.ts';
import type { FleetMetadata } from '../src/schemas/fleetMetadataSchema.ts';
import type { UserRole } from '../src/schemas/authSchema.ts';
import { AppError } from '../src/errors/AppError.ts';
const sessions: SessionService = {
  ...sessionService,
  async authenticateAccessToken(token) {
    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(token))
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return {
      sessionId: randomUUID(),
      user: {
        id: randomUUID(),
        name: 'Test',
        email: 'test@example.test',
        phone: '+201012345678',
        role: token as UserRole,
        language: 'ar',
        emailVerifiedAt: '2026-01-01T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      },
    };
  },
};
function memory(): BusTypeService {
  const items: FleetMetadata[] = [];
  return {
    async list({ limit, offset }) {
      return items.slice(offset, offset + limit);
    },
    async findById(id) {
      return items.find((item) => item.id === id) ?? null;
    },
    async create(input) {
      const item = { id: randomUUID(), ...input };
      items.push(item);
      return item;
    },
    async update(id, input) {
      const item = items.find((item) => item.id === id);
      if (!item) return null;
      Object.assign(item, input);
      return item;
    },
    async remove(id) {
      const index = items.findIndex((item) => item.id === id);
      return index < 0 ? null : items.splice(index, 1)[0]!;
    },
  };
}
const headers = {
  Authorization: 'Bearer ADMIN',
  'Content-Type': 'application/json',
};
async function start(
  t: TestContext,
  overrides: Parameters<typeof createApp>[1] = {},
) {
  const server = createApp([], { sessions, ...overrides }).listen(
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
  return 'http://127.0.0.1:' + address.port + '/api/v1';
}
for (const [path, key, prefix] of [
  ['bus-types', 'busTypes', 'BUS_TYPE'],
  ['amenities', 'amenities', 'AMENITY'],
] as const) {
  test(
    path +
      ' CRUD normalizes stable codes, trims bilingual labels and preserves omitted fields',
    async (t) => {
      const base = (await start(t, { [key]: memory() })) + '/' + path;
      const create = await fetch(base, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: ' vip ',
          nameAr: ' مميز ',
          nameEn: ' Premium ',
        }),
      });
      assert.equal(create.status, 201);
      const item = (await create.json()).data;
      assert.deepEqual(item, {
        id: item.id,
        code: 'VIP',
        nameAr: 'مميز',
        nameEn: 'Premium',
      });
      assert.equal(
        create.headers.get('location'),
        '/api/v1/' + path + '/' + item.id,
      );
      assert.equal(create.headers.get('cache-control'), 'no-store');
      assert.deepEqual(
        (await (await fetch(base + '/' + item.id, { headers })).json()).data,
        item,
      );
      const page = await fetch(base + '?limit=1&offset=0', { headers });
      assert.deepEqual(await page.json(), {
        data: [item],
        pagination: { limit: 1, offset: 0 },
      });
      const update = await fetch(base + '/' + item.id, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ nameEn: 'Updated' }),
      });
      assert.equal(update.status, 200);
      assert.deepEqual((await update.json()).data, {
        ...item,
        nameEn: 'Updated',
      });
      assert.equal(
        (await fetch(base + '/' + item.id, { method: 'DELETE', headers }))
          .status,
        204,
      );
      const missing = await fetch(base + '/' + item.id, { headers });
      assert.equal(missing.status, 404);
      assert.equal((await missing.json()).error.code, prefix + '_NOT_FOUND');
    },
  );
  test(
    path + ' rejects invalid metadata, unsupported queries and non-JSON writes',
    async (t) => {
      let calls = 0;
      const service = memory();
      service.create = async (input) => {
        calls++;
        return { id: randomUUID(), ...input };
      };
      const base = (await start(t, { [key]: service })) + '/' + path;
      for (const body of [
        { code: '1VIP', nameAr: 'مميز', nameEn: 'Premium' },
        { code: 'A-B', nameAr: 'مميز', nameEn: 'Premium' },
        { code: 'A'.repeat(33), nameAr: 'مميز', nameEn: 'Premium' },
        { code: 'VIP', nameAr: ' ', nameEn: 'Premium' },
        { code: 'VIP', nameAr: 'مميز', nameEn: 'a'.repeat(101) },
        { code: 'VIP', nameAr: 'مميز', nameEn: 'Premium', id: randomUUID() },
      ])
        assert.equal(
          (
            await fetch(base, {
              method: 'POST',
              headers,
              body: JSON.stringify(body),
            })
          ).status,
          400,
        );
      assert.equal(
        (
          await fetch(base, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ADMIN',
              'Content-Type': 'text/plain',
            },
            body: 'text',
          })
        ).status,
        415,
      );
      for (const suffix of [
        '?limit=101',
        '?owner=x',
        '/invalid',
        '/' + randomUUID() + '?extra=1',
      ])
        assert.equal((await fetch(base + suffix, { headers })).status, 400);
      for (const body of [{}, { nameEn: ' ' }, { isActive: false }])
        assert.equal(
          (
            await fetch(base + '/' + randomUUID(), {
              method: 'PATCH',
              headers,
              body: JSON.stringify(body),
            })
          ).status,
          400,
        );
      assert.equal(calls, 0);
    },
  );
  test(
    path +
      ' denies passengers and anonymous users on every method and hides internal failures',
    async (t) => {
      const service = memory(),
        base = (await start(t, { [key]: service })) + '/' + path;
      for (const [method, suffix] of [
        ['GET', ''],
        ['GET', '/' + randomUUID()],
        ['POST', ''],
        ['PATCH', '/' + randomUUID()],
        ['DELETE', '/' + randomUUID()],
        ['HEAD', ''],
      ])
        for (const token of ['', 'USER']) {
          const response = await fetch(base + suffix, {
            method,
            headers: token ? { Authorization: 'Bearer ' + token } : {},
          });
          assert.equal(response.status, token ? 403 : 401);
          assert.equal(response.headers.get('cache-control'), 'no-store');
        }
      assert.equal(
        (
          await fetch(base, {
            headers: { Authorization: 'Bearer SUPER_ADMIN' },
          })
        ).status,
        200,
      );
      service.create = async () => {
        throw new AppError(409, prefix + '_CODE_EXISTS', 'Code already exists');
      };
      const conflict = await fetch(base, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: 'VIP',
          nameAr: 'مميز',
          nameEn: 'Premium',
        }),
      });
      assert.equal(conflict.status, 409);
      assert.equal((await conflict.json()).error.code, prefix + '_CODE_EXISTS');
      service.list = async () => {
        throw Error('private SQL connection password');
      };
      const failed = await fetch(base, { headers });
      assert.equal(failed.status, 500);
      assert.doesNotMatch(await failed.text(), /private|SQL|password/);
    },
  );
}
test('bus requests forward optional type and amenity assignments and type filters without resetting omitted fields', async (t) => {
  const type = {
      id: randomUUID(),
      code: 'VIP',
      nameAr: 'مميز',
      nameEn: 'Premium',
    },
    amenity = {
      id: randomUUID(),
      code: 'WIFI',
      nameAr: 'واي فاي',
      nameEn: 'Wi-Fi',
    };
  const bus = {
    id: randomUUID(),
    plateNumber: 'VIP 1',
    seatCount: 20,
    isActive: true,
    busTypeId: type.id,
    busType: type,
    amenities: [amenity],
  };
  let received: unknown;
  const service = {
    ...busService,
    async create(input: Parameters<typeof busService.create>[0]) {
      received = input;
      return bus;
    },
    async update(_id: string, input: Parameters<typeof busService.update>[1]) {
      received = input;
      return bus;
    },
    async list(query: Parameters<typeof busService.list>[0]) {
      received = query;
      return [bus];
    },
  };
  const base = (await start(t, { buses: service })) + '/buses';
  const created = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      plateNumber: ' vip 1 ',
      seatCount: 20,
      busTypeId: type.id,
      amenityIds: [amenity.id],
    }),
  });
  assert.equal(created.status, 201);
  assert.deepEqual(received, {
    plateNumber: 'VIP 1',
    seatCount: 20,
    isActive: true,
    busTypeId: type.id,
    amenityIds: [amenity.id],
  });
  assert.equal(
    (
      await fetch(base + '/' + bus.id, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive: false }),
      })
    ).status,
    200,
  );
  assert.deepEqual(received, { isActive: false });
  assert.equal(
    (
      await fetch(base + '/' + bus.id, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ busTypeId: null, amenityIds: [] }),
      })
    ).status,
    200,
  );
  assert.deepEqual(received, { busTypeId: null, amenityIds: [] });
  assert.equal(
    (
      await fetch(base + '?busTypeId=' + type.id + '&isActive=true', {
        headers,
      })
    ).status,
    200,
  );
  assert.deepEqual(received, {
    busTypeId: type.id,
    isActive: true,
    limit: 20,
    offset: 0,
  });
});
test('bus metadata validation rejects duplicate, excessive and malformed assignments before services', async (t) => {
  const base = (await start(t)) + '/buses',
    id = randomUUID();
  for (const extra of [
    { busTypeId: 'invalid' },
    { amenityIds: [id, id] },
    { amenityIds: [null] },
    { amenityIds: null },
    { amenityIds: Array.from({ length: 31 }, () => randomUUID()) },
    { busType: { code: 'VIP' } },
    { amenities: ['WIFI'] },
  ])
    assert.equal(
      (
        await fetch(base, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            plateNumber: 'TEST',
            seatCount: 20,
            ...extra,
          }),
        })
      ).status,
      400,
    );
  assert.equal(
    (await fetch(base + '?busTypeId=invalid', { headers })).status,
    400,
  );
});
