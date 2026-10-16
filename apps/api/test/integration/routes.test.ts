import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import {
  isCheckViolation,
  isForeignKeyViolation,
  isRestrictViolation,
} from '../../src/utils/databaseErrors.ts';

test('directed Route CRUD, filtering, concurrent uniqueness and station restrictions work in PostgreSQL', async (t) => {
  const server = createApp([]).listen(0, '127.0.0.1');
  const routes: string[] = [];
  const stations: string[] = [];
  const cities: string[] = [];
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const id of routes) await db.orm.public.Route.where({ id }).delete();
      for (const id of stations)
        await db.orm.public.Station.where({ id }).delete();
      for (const id of cities) await db.orm.public.City.where({ id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1';
  const json = { 'Content-Type': 'application/json' };
  const city = await db.orm.public.City.create({
    nameAr: 'مدينة اختبار',
    nameEn: 'Route test ' + randomUUID(),
  });
  const cityId = city.id;
  cities.push(cityId);
  for (const name of ['A', 'B', 'C']) {
    const station = await db.orm.public.Station.create({
      nameAr: 'محطة اختبار',
      nameEn: name,
      cityId,
    });
    stations.push(station.id);
  }
  const [a, b, c] = stations;
  assert.ok(a && b && c);
  const input = {
    originStationId: a,
    destinationStationId: b,
    estimatedDurationMinutes: 180,
  };
  async function create(body: typeof input & { isActive?: boolean }) {
    const response = await fetch(base + '/routes', {
      method: 'POST',
      headers: json,
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (response.status === 201) routes.push(result.data.id);
    return { response, result };
  }
  async function patch(id: string, body: object) {
    return await fetch(base + '/routes/' + id, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify(body),
    });
  }
  const first = await create(input);
  assert.equal(first.response.status, 201);
  const id = first.result.data.id;
  assert.equal(first.response.headers.get('location'), '/api/v1/routes/' + id);
  assert.deepEqual(first.result.data, { id, ...input, isActive: true });
  assert.equal(
    (await db.orm.public.Route.where({ id }).first())?.estimatedDurationMinutes,
    180,
  );
  const reverse = await create({
    ...input,
    originStationId: b,
    destinationStationId: a,
    isActive: false,
  });
  assert.equal(reverse.response.status, 201);
  const duplicate = await create(input);
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.result.error.code, 'ROUTE_EXISTS');
  const parallel = await Promise.all([
    create({ ...input, destinationStationId: c }),
    create({ ...input, destinationStationId: c }),
  ]);
  assert.deepEqual(parallel.map((r) => r.response.status).sort(), [201, 409]);
  const conflict = parallel.find((r) => r.response.status === 409);
  assert.equal(conflict?.result.error.code, 'ROUTE_EXISTS');

  const list = await fetch(base + '/routes?originStationId=' + a);
  assert.equal(list.status, 200);
  const listed = (await list.json()).data;
  assert.equal(listed.length, 2);
  assert.ok(
    listed.every((r: { originStationId: string }) => r.originStationId === a),
  );
  const page = await fetch(
    base + '/routes?originStationId=' + a + '&limit=1&offset=1',
  );
  assert.equal((await page.json()).data[0].id, listed[1].id);
  const filtered = await fetch(
    base +
      '/routes?originStationId=' +
      b +
      '&destinationStationId=' +
      a +
      '&isActive=false',
  );
  assert.deepEqual(
    (await filtered.json()).data.map((r: { id: string }) => r.id),
    [reverse.result.data.id],
  );
  const empty = await fetch(
    base + '/routes?destinationStationId=' + randomUUID(),
  );
  assert.deepEqual((await empty.json()).data, []);
  const found = await fetch(base + '/routes/' + id);
  assert.equal(found.status, 200);
  assert.equal((await found.json()).data.id, id);

  const updated = await patch(id, {
    estimatedDurationMinutes: 10080,
    isActive: false,
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).data.estimatedDurationMinutes, 10080);
  const preserved = await patch(id, { estimatedDurationMinutes: 1 });
  assert.equal(preserved.status, 200);
  assert.equal((await preserved.json()).data.isActive, false);
  const sameEndpoint = await patch(id, { destinationStationId: a });
  assert.equal(sameEndpoint.status, 400);
  assert.equal((await sameEndpoint.json()).error.code, 'VALIDATION_ERROR');
  const duplicateEdit = await patch(id, {
    destinationStationId: c,
    estimatedDurationMinutes: 999,
  });
  assert.equal(duplicateEdit.status, 409);
  assert.equal((await duplicateEdit.json()).error.code, 'ROUTE_EXISTS');
  assert.equal(
    (await db.orm.public.Route.where({ id }).first())?.estimatedDurationMinutes,
    1,
  );
  assert.equal(
    (await db.orm.public.Route.where({ id }).first())?.destinationStationId,
    b,
  );
  for (const field of ['originStationId', 'destinationStationId']) {
    const invalid = await create({ ...input, [field]: randomUUID() });
    assert.equal(invalid.response.status, 404);
    assert.equal(invalid.result.error.code, 'STATION_NOT_FOUND');
    const invalidEdit = await patch(id, { [field]: randomUUID() });
    assert.equal(invalidEdit.status, 404);
    assert.equal((await invalidEdit.json()).error.code, 'STATION_NOT_FOUND');
  }
  await assert.rejects(
    db.orm.public.Route.create({ ...input, originStationId: randomUUID() }),
    isForeignKeyViolation,
  );
  await assert.rejects(
    db.orm.public.Route.create({ ...input, destinationStationId: a }),
    (error) => isCheckViolation(error, 'route_distinct_stations_0ade44e1'),
  );
  for (const duration of [0, 10081])
    await assert.rejects(
      db.orm.public.Route.where({ id }).update({
        estimatedDurationMinutes: duration,
      }),
      (error) => isCheckViolation(error, 'route_duration_range_c4fded6c'),
    );
  for (const stationId of [a, b, c]) {
    const blocked = await fetch(base + '/stations/' + stationId, {
      method: 'DELETE',
    });
    assert.equal(blocked.status, 409);
    assert.equal((await blocked.json()).error.code, 'STATION_HAS_ROUTES');
    assert.ok(await db.orm.public.Station.where({ id: stationId }).first());
    await assert.rejects(
      db.orm.public.Station.where({ id: stationId }).delete(),
      (error) => isForeignKeyViolation(error) || isRestrictViolation(error),
    );
  }
  // Change both endpoints in one valid edit; the reverse direction stays independent.
  const moved = await patch(reverse.result.data.id, {
    originStationId: c,
    destinationStationId: b,
  });
  assert.equal(moved.status, 200);
  assert.equal((await moved.json()).data.originStationId, c);
  for (const routeId of routes) {
    const removed = await fetch(base + '/routes/' + routeId, {
      method: 'DELETE',
    });
    assert.equal(removed.status, 204);
    assert.equal(await removed.text(), '');
  }
  assert.equal((await fetch(base + '/routes/' + id)).status, 404);
  assert.equal((await patch(id, { isActive: true })).status, 404);
  assert.equal(
    (await fetch(base + '/routes/' + id, { method: 'DELETE' })).status,
    404,
  );
  for (const stationId of stations)
    assert.equal(
      (await fetch(base + '/stations/' + stationId, { method: 'DELETE' }))
        .status,
      204,
    );
});
