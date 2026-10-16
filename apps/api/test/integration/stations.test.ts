import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import {
  isForeignKeyViolation,
  isRestrictViolation,
} from '../../src/utils/databaseErrors.ts';

test('Station CRUD, city filtering, moves and restrictive foreign keys work in PostgreSQL', async (t) => {
  const server = createApp([]).listen(0, '127.0.0.1');
  const cities: string[] = [];
  const stations: string[] = [];
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
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
  const cityA = await db.orm.public.City.create({
    nameAr: 'مدينة اختبار',
    nameEn: 'Station test A ' + randomUUID(),
  });
  cities.push(cityA.id);
  const cityB = await db.orm.public.City.create({
    nameAr: 'مدينة اختبار ثانية',
    nameEn: 'Station test B ' + randomUUID(),
  });
  cities.push(cityB.id);
  for (const [nameEn, cityId] of [
    ['Alpha', cityA.id],
    ['Beta', cityA.id],
    ['Gamma', cityB.id],
  ]) {
    const response = await fetch(base + '/stations', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ nameAr: 'محطة اختبار', nameEn, cityId }),
    });
    assert.equal(response.status, 201);
    const { data } = await response.json();
    stations.push(data.id);
    assert.equal(data.cityId, cityId);
    assert.equal(data.nameEn, nameEn);
    assert.equal(
      response.headers.get('location'),
      '/api/v1/stations/' + data.id,
    );
    assert.equal(
      (await db.orm.public.Station.where({ id: data.id }).first())?.cityId,
      cityId,
    );
  }
  const [alpha, beta, gamma] = stations;
  assert.ok(alpha && beta && gamma);
  const filtered = await fetch(base + '/stations?cityId=' + cityA.id);
  assert.equal(filtered.status, 200);
  assert.deepEqual(
    (await filtered.json()).data.map((s: { nameEn: string }) => s.nameEn),
    ['Alpha', 'Beta'],
  );
  const page = await fetch(
    base + '/stations?cityId=' + cityA.id + '&limit=1&offset=1',
  );
  assert.equal((await page.json()).data[0].id, beta);
  const found = await fetch(base + '/stations/' + alpha);
  assert.equal(found.status, 200);
  assert.equal((await found.json()).data.cityId, cityA.id);

  const missingCity = randomUUID();
  const invalidCreate = await fetch(base + '/stations', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({
      nameAr: 'اختبار',
      nameEn: 'Invalid',
      cityId: missingCity,
    }),
  });
  assert.equal(invalidCreate.status, 404);
  assert.equal((await invalidCreate.json()).error.code, 'CITY_NOT_FOUND');
  const invalidMove = await fetch(base + '/stations/' + alpha, {
    method: 'PATCH',
    headers: json,
    body: JSON.stringify({ cityId: missingCity }),
  });
  assert.equal(invalidMove.status, 404);
  assert.equal((await invalidMove.json()).error.code, 'CITY_NOT_FOUND');
  assert.equal(
    (await db.orm.public.Station.where({ id: alpha }).first())?.cityId,
    cityA.id,
  );
  // The database itself must reject orphans even when callers bypass HTTP validation.
  await assert.rejects(
    db.orm.public.Station.create({
      nameAr: 'اختبار',
      nameEn: 'Invalid direct write',
      cityId: missingCity,
    }),
    isForeignKeyViolation,
  );

  const moved = await fetch(base + '/stations/' + alpha, {
    method: 'PATCH',
    headers: json,
    body: JSON.stringify({ nameEn: 'Alpha updated', cityId: cityB.id }),
  });
  assert.equal(moved.status, 200);
  assert.deepEqual((await moved.json()).data, {
    id: alpha,
    nameAr: 'محطة اختبار',
    nameEn: 'Alpha updated',
    cityId: cityB.id,
  });
  const source = await fetch(base + '/stations?cityId=' + cityA.id);
  assert.equal((await source.json()).data.length, 1);
  const destination = await fetch(base + '/stations?cityId=' + cityB.id);
  assert.equal((await destination.json()).data.length, 2);
  const blockedDelete = await fetch(base + '/cities/' + cityB.id, {
    method: 'DELETE',
  });
  assert.equal(blockedDelete.status, 409);
  assert.equal((await blockedDelete.json()).error.code, 'CITY_HAS_STATIONS');
  await assert.rejects(
    db.orm.public.City.where({ id: cityB.id }).delete(),
    (error) => isForeignKeyViolation(error) || isRestrictViolation(error),
  );
  assert.ok(await db.orm.public.Station.where({ id: alpha }).first());

  const removed = await fetch(base + '/stations/' + beta, { method: 'DELETE' });
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), '');
  const missing = await fetch(base + '/stations/' + beta);
  assert.equal(missing.status, 404);
  const emptyCity = await fetch(base + '/cities/' + cityA.id, {
    method: 'DELETE',
  });
  assert.equal(emptyCity.status, 204);
  for (const id of [alpha, gamma]) {
    const response = await fetch(base + '/stations/' + id, {
      method: 'DELETE',
    });
    assert.equal(response.status, 204);
  }
  const freedCity = await fetch(base + '/cities/' + cityB.id, {
    method: 'DELETE',
  });
  assert.equal(freedCity.status, 204);
});
