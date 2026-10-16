import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';

// Opt-in test: writes one uniquely named row and removes only that row afterward.
test('city HTTP CRUD persists UUID records in PostgreSQL', async (t) => {
  const server = createApp([]).listen(0, '127.0.0.1');
  const createdCity: { id?: string } = {};
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      if (createdCity.id) {
        await db.orm.public.City.where({ id: createdCity.id }).delete();
      }
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = 'http://127.0.0.1:' + address.port + '/api/v1/cities';
  const name = 'HTTP test ' + randomUUID();
  const created = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nameAr: 'اختبار', nameEn: name }),
  });
  assert.equal(created.status, 201);
  const body = await created.json();
  const createdId: unknown = body.data.id;
  if (typeof createdId === 'string') createdCity.id = createdId;
  assert.ok(typeof createdId === 'string');
  assert.match(
    createdId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  const persisted = await db.orm.public.City.where({ id: createdId }).first();
  assert.equal(persisted?.nameEn, name);
  const found = await fetch(baseUrl + '/' + createdId);
  assert.equal(found.status, 200);
  assert.deepEqual(await found.json(), body);
  const list = await fetch(baseUrl + '?limit=1&offset=0');
  assert.equal(list.status, 200);
  const page = await list.json();
  assert.equal(page.data.length, 1);
  assert.deepEqual(page.pagination, { limit: 1, offset: 0 });
  const updated = await fetch(baseUrl + '/' + createdId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nameEn: 'Updated ' + name }),
  });
  assert.equal(updated.status, 200);
  assert.deepEqual((await updated.json()).data, {
    id: createdId,
    nameAr: 'اختبار',
    nameEn: 'Updated ' + name,
  });
  const stored = await db.orm.public.City.where({ id: createdId }).first();
  assert.equal(stored?.nameEn, 'Updated ' + name);
  const removed = await fetch(baseUrl + '/' + createdId, { method: 'DELETE' });
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), '');
  assert.equal(await db.orm.public.City.where({ id: createdId }).first(), null);
  const missing = await fetch(baseUrl + '/' + createdId);
  assert.equal(missing.status, 404);
});
