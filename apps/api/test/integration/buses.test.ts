import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import {
  isUniqueViolation,
  isForeignKeyViolation,
} from '../../src/utils/databaseErrors.ts';

test('bus seats are atomic, unique, stable during resizing, and safe under concurrent HTTP writes', async (t) => {
  const server = createApp([]).listen(0, '127.0.0.1');
  const busIds = new Set<string>();
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const id of busIds) await db.orm.public.Bus.where({ id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1/buses';
  const json = { 'Content-Type': 'application/json' };
  const plate = 'BUS-' + randomUUID().slice(0, 12).toUpperCase();
  async function create(
    plateNumber: string,
    seatCount: number,
    isActive?: boolean,
  ) {
    const response = await fetch(base, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        plateNumber,
        seatCount,
        ...(isActive === undefined ? {} : { isActive }),
      }),
    });
    const body = await response.json();
    if (response.status === 201) busIds.add(body.data.id);
    return { response, body };
  }
  async function seats(id: string) {
    const response = await fetch(base + '/' + id + '/seats');
    assert.equal(response.status, 200);
    return (await response.json()).data as Array<{
      id: string;
      number: number;
      busId: string;
    }>;
  }
  async function patch(id: string, body: unknown) {
    return fetch(base + '/' + id, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify(body),
    });
  }
  const first = await create(' ' + plate.toLowerCase() + ' ', 3, false);
  assert.equal(first.response.status, 201);
  const bus = first.body.data;
  assert.equal(bus.plateNumber, plate);
  assert.equal(bus.isActive, false);
  const initial = await seats(bus.id);
  assert.deepEqual(
    initial.map((s) => s.number),
    [1, 2, 3],
  );
  assert.equal(new Set(initial.map((s) => s.id)).size, 3);
  const second = await create(plate + '-B', 100);
  assert.equal(second.response.status, 201);
  assert.equal((await seats(second.body.data.id)).length, 100);
  const duplicate = await create(plate.toLowerCase(), 2);
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.body.error.code, 'PLATE_NUMBER_EXISTS');
  assert.equal(
    (await db.orm.public.Bus.where({ plateNumber: plate }).all()).length,
    1,
  );

  const grow = await patch(bus.id, { seatCount: 5 });
  assert.equal(grow.status, 200);
  let current = await seats(bus.id);
  assert.deepEqual(
    current.map((s) => s.number),
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    current.slice(0, 3).map((s) => s.id),
    initial.map((s) => s.id),
  );
  const shrink = await patch(bus.id, { seatCount: 2 });
  assert.equal(shrink.status, 200);
  current = await seats(bus.id);
  assert.deepEqual(
    current.map((s) => s.number),
    [1, 2],
  );
  assert.equal(current[0].id, initial[0].id);

  // Seat writes happen before the conflicting plate update: every change must roll back.
  const conflict = await patch(bus.id, {
    seatCount: 4,
    plateNumber: second.body.data.plateNumber,
  });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.code, 'PLATE_NUMBER_EXISTS');
  assert.equal(
    (await db.orm.public.Bus.where({ id: bus.id }).first())?.seatCount,
    2,
  );
  assert.deepEqual(
    (await seats(bus.id)).map((s) => s.number),
    [1, 2],
  );
  const renamed = await patch(bus.id, { plateNumber: plate + '-NEW' });
  assert.equal(renamed.status, 200);
  assert.equal((await renamed.json()).data.isActive, false);
  const deactivate = await patch(second.body.data.id, { isActive: false });
  assert.equal(deactivate.status, 200);
  const filtered = await fetch(base + '?isActive=false&limit=100');
  assert.equal(filtered.status, 200);
  assert.ok(
    (await filtered.json()).data.every(
      (b: { isActive: boolean }) => !b.isActive,
    ),
  );

  const updates = await Promise.all([
    patch(bus.id, { seatCount: 6 }),
    patch(bus.id, { seatCount: 4 }),
  ]);
  assert.ok(updates.every((r) => r.status === 200));
  const stored = await db.orm.public.Bus.where({ id: bus.id }).first();
  assert.ok(stored);
  current = await seats(bus.id);
  assert.equal(current.length, stored.seatCount);
  assert.deepEqual(
    current.map((s) => s.number),
    Array.from({ length: stored.seatCount }, (_, i) => i + 1),
  );
  assert.equal(current[0].id, initial[0].id);
  const racePlate = plate + '-RACE';
  const race = await Promise.all([
    create(racePlate, 2),
    create(racePlate.toLowerCase(), 2),
  ]);
  assert.deepEqual(race.map((r) => r.response.status).sort(), [201, 409]);
  assert.equal(
    (await db.orm.public.Bus.where({ plateNumber: racePlate }).all()).length,
    1,
  );

  await assert.rejects(
    db.orm.public.BusSeat.create({ busId: bus.id, number: 1 }),
    (error) => isUniqueViolation(error, 'BusSeat_busId_number_key'),
  );
  await assert.rejects(
    db.orm.public.BusSeat.create({ busId: randomUUID(), number: 1 }),
    isForeignKeyViolation,
  );
  await assert.rejects(
    db.orm.public.BusSeat.create({ busId: bus.id, number: 0 }),
    (error) =>
      error instanceof Error &&
      'sqlState' in error &&
      error.sqlState === '23514',
  );
  await assert.rejects(
    db.orm.public.Bus.create({ plateNumber: plate + '-INVALID', seatCount: 0 }),
    (error) =>
      error instanceof Error &&
      'sqlState' in error &&
      error.sqlState === '23514',
  );
  assert.equal(
    await db.orm.public.Bus.where({ plateNumber: plate + '-INVALID' }).first(),
    null,
  );

  for (const id of busIds) {
    const response = await fetch(base + '/' + id, { method: 'DELETE' });
    assert.equal(response.status, 204);
    assert.equal(
      (await db.orm.public.BusSeat.where({ busId: id }).all()).length,
      0,
    );
    assert.equal((await fetch(base + '/' + id + '/seats')).status, 404);
  }
});
