import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import postgres from '@prisma/orm-postgres/runtime';
import contractJson from '../src/prisma/contract.json' with { type: 'json' };
import type { Contract } from '../src/prisma/contract.d.ts';
import { createAdminCatalogRouter } from '../src/routes/adminCatalogRoutes.ts';
import { createAdminCatalogService } from '../src/services/adminCatalogService.ts';
import { requireRole } from '../src/middlewares/requireRole.ts';
import { errorHandler } from '../src/middlewares/errorHandler.ts';
import {
  adminCityListQuerySchema,
  adminStationListQuerySchema,
} from '../src/schemas/adminCatalogSchema.ts';
import { cityListQuerySchema } from '../src/schemas/citySchema.ts';

const app = express();
const calls: unknown[] = [];
app.use((request, response, next) => {
  const role = request.headers['x-test-role'];
  if (role) response.locals.auth = { user: { role } };
  next();
});
app.use(
  '/api/v1/admin',
  createAdminCatalogRouter(
    {
      async cities(query) {
        calls.push(query);
        return {
          items: [],
          total: 0,
          pagination: { limit: query.limit, offset: query.offset },
        };
      },
      async stations(query) {
        calls.push(query);
        return {
          items: [],
          total: 0,
          pagination: { limit: query.limit, offset: query.offset },
        };
      },
    },
    [requireRole('ADMIN', 'SUPER_ADMIN')],
  ),
);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve) => server.once('listening', resolve));
const address = server.address();
assert(address && typeof address === 'object');
const base = `http://127.0.0.1:${address.port}/api/v1/admin`;
after(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
);

test('administration reads require a current staff role', async () => {
  for (const resource of ['cities', 'stations']) {
    for (const [role, status] of [
      [undefined, 401],
      ['USER', 403],
      ['ADMIN', 200],
      ['SUPER_ADMIN', 200],
    ] as const) {
      const response = await fetch(`${base}/${resource}`, {
        headers: role ? { 'x-test-role': role } : {},
      });
      assert.equal(response.status, status);
      if (status === 200)
        assert.equal(
          response.headers.get('cache-control'),
          'private, no-store',
        );
    }
  }
});
test('strict request validation rejects malformed/unknown parameters', async () => {
  const beforeCalls = calls.length;
  for (const query of [
    'limit=0',
    'offset=-1',
    'search[]=x',
    'unknown=x',
    'locale=de',
    'search=' + 'x'.repeat(201),
  ]) {
    const response = await fetch(`${base}/cities?${query}`, {
      headers: { 'x-test-role': 'ADMIN' },
    });
    assert.equal(response.status, 400, query);
  }
  assert.equal(
    (
      await fetch(`${base}/stations?cityId=invalid`, {
        headers: { 'x-test-role': 'ADMIN' },
      })
    ).status,
    400,
  );
  assert.equal(calls.length, beforeCalls);
  await fetch(`${base}/cities?search=%20Cairo%20&locale=ar&limit=5&offset=10`, {
    headers: { 'x-test-role': 'ADMIN' },
  });
  assert.deepEqual(calls.at(-1), {
    search: 'Cairo',
    locale: 'ar',
    limit: 5,
    offset: 10,
  });
});
test('public catalog query contracts remain unchanged', () => {
  assert(cityListQuerySchema.safeParse({ limit: '20', offset: '0' }).success);
  assert.equal(
    cityListQuerySchema.safeParse({ search: 'Cairo' }).success,
    false,
  );
});

// SQL tests only accept the dedicated disposable database, never an application URL.
const url = process.env.CATALOG_TEST_DATABASE_URL;
if (url) {
  const target = new URL(url);
  assert.equal(target.hostname, '127.0.0.1');
  assert.equal(target.port, '18985');
  assert.equal(target.pathname, '/catalog_test');
}
const db = url ? postgres<Contract>({ contractJson, url }) : null;
const service = db ? createAdminCatalogService(db) : null;
const cairo = '20000000-0000-4000-8000-000000000001';
const alex = '20000000-0000-4000-8000-000000000002';
before(async () => {
  if (!db || !url) return;
  // Match the text identifiers used by the application migrations.
  await db
    .runtime()
    .execute(
      db.raw
        .sql`CREATE TABLE "public"."City" ("id" text PRIMARY KEY, "nameAr" text NOT NULL, "nameEn" text NOT NULL)`
        .affectedCount()
        .build(),
    );
  await db
    .runtime()
    .execute(
      db.raw
        .sql`CREATE TABLE "public"."Station" ("id" text PRIMARY KEY, "nameAr" text NOT NULL, "nameEn" text NOT NULL, "cityId" text NOT NULL REFERENCES "public"."City")`
        .affectedCount()
        .build(),
    );
  await db
    .runtime()
    .execute(
      db.raw
        .sql`INSERT INTO "public"."City" VALUES (${cairo}::text, 'القاهرة', 'Alpha Cairo'), (${alex}::text, 'الإسكندرية', 'Zeta Alexandria'), ('20000000-0000-4000-8000-000000000003', 'مدينة النسبة', '100% literal')`
        .affectedCount()
        .build(),
    );
  await db
    .runtime()
    .execute(
      db.raw
        .sql`INSERT INTO "public"."Station" SELECT ('30000000-0000-4000-8000-' || lpad(i::text,12,'0'))::text, CASE WHEN i=1 THEN 'رمسيس' ELSE 'محطة ' || i END, 'Station ' || lpad(i::text,2,'0'), ${cairo}::text FROM generate_series(1,25) i`
        .affectedCount()
        .build(),
    );
  await db
    .runtime()
    .execute(
      db.raw
        .sql`INSERT INTO "public"."Station" VALUES ('30000000-0000-4000-8000-000000000026', 'محطة البحر', 'Sea station', ${alex}::text)`
        .affectedCount()
        .build(),
    );
});
after(async () => {
  await db?.close();
});
const sqlOptions = { skip: !db };
test(
  'SQL returns full relation counts even for a single-row city page',
  sqlOptions,
  async () => {
    const page = await service!.cities(
      adminCityListQuerySchema.parse({ search: 'cairo', limit: '1' }),
    );
    assert.equal(page.total, 1);
    assert.equal(page.items[0]?.stationCount, 25);
  },
);
test(
  'SQL search is bilingual and treats wildcards and SQL syntax as literal text',
  sqlOptions,
  async () => {
    assert.equal(
      (
        await service!.cities(
          adminCityListQuerySchema.parse({ search: 'القاهرة' }),
        )
      ).total,
      1,
    );
    assert.equal(
      (await service!.cities(adminCityListQuerySchema.parse({ search: '%' })))
        .total,
      1,
    );
    assert.equal(
      (
        await service!.cities(
          adminCityListQuerySchema.parse({ search: "%' OR 1=1 --" }),
        )
      ).total,
      0,
    );
    assert.equal(
      (await service!.cities(adminCityListQuerySchema.parse({}))).total,
      3,
    );
  },
);
test(
  'SQL lists stations with text city identifiers without requiring a filter',
  sqlOptions,
  async () => {
    const page = await service!.stations(adminStationListQuerySchema.parse({}));
    assert.equal(page.total, 26);
    assert.equal(page.items.length, 20);
    assert(page.items.some((station) => station.cityId === alex));
    const filtered = await service!.stations(
      adminStationListQuerySchema.parse({ cityId: alex }),
    );
    assert.equal(filtered.total, 1);
    assert.equal(filtered.items[0]?.city.id, alex);
  },
);

test(
  'SQL pagination uses filtered totals and includes a city outside the requested page',
  sqlOptions,
  async () => {
    const first = await service!.stations(
      adminStationListQuerySchema.parse({ cityId: cairo, limit: '20' }),
    );
    const second = await service!.stations(
      adminStationListQuerySchema.parse({
        cityId: cairo,
        limit: '20',
        offset: '20',
      }),
    );
    assert.equal(first.total, 25);
    assert.equal(second.total, 25);
    assert.equal(first.items.length, 20);
    assert.equal(second.items.length, 5);
    assert.equal(
      new Set([...first.items, ...second.items].map((row) => row.id)).size,
      25,
    );
    assert.equal(first.items[0]?.city.nameAr, 'القاهرة');
    const emptyPage = await service!.stations(
      adminStationListQuerySchema.parse({ cityId: cairo, offset: '100' }),
    );
    assert.equal(emptyPage.items.length, 0);
    assert.equal(emptyPage.total, 25);
  },
);
test(
  'SQL combines city-name search with city filtering and stable language-selected order',
  sqlOptions,
  async () => {
    assert.equal(
      (
        await service!.stations(
          adminStationListQuerySchema.parse({ search: 'CAIRO' }),
        )
      ).total,
      25,
    );
    assert.equal(
      (
        await service!.stations(
          adminStationListQuerySchema.parse({
            search: 'القاهرة',
            cityId: alex,
          }),
        )
      ).total,
      0,
    );
    const ar = await service!.cities(
      adminCityListQuerySchema.parse({ locale: 'ar' }),
    );
    const en = await service!.cities(
      adminCityListQuerySchema.parse({ locale: 'en' }),
    );
    assert.notDeepEqual(
      ar.items.map((row) => row.id),
      en.items.map((row) => row.id),
    );
    assert.deepEqual(
      (await service!.cities(adminCityListQuerySchema.parse({ locale: 'ar' })))
        .items,
      ar.items,
    );
  },
);
