import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import postgres from '@prisma/orm-postgres/runtime';
import contractJson from '../src/prisma/contract.json' with { type: 'json' };
import type { Contract } from '../src/prisma/contract.d.ts';
import { createAdminFleetRouter } from '../src/routes/adminFleetRoutes.ts';
import { createAdminFleetService } from '../src/services/adminFleetService.ts';
import { requireRole } from '../src/middlewares/requireRole.ts';
import { errorHandler } from '../src/middlewares/errorHandler.ts';
import { adminFleetListQuerySchema } from '../src/schemas/adminFleetSchema.ts';
import { fleetMetadataListSchema } from '../src/schemas/fleetMetadataSchema.ts';

const calls: unknown[] = [];
const list = async (
  query: ReturnType<typeof adminFleetListQuerySchema.parse>,
) => {
  calls.push(query);
  return {
    items: [],
    total: 0,
    pagination: { limit: query.limit, offset: query.offset },
  };
};
const app = express();
app.use((request, response, next) => {
  const role = request.headers['x-test-role'];
  if (role) response.locals.auth = { user: { role } };
  next();
});
app.use(
  '/api/v1/admin',
  createAdminFleetRouter({ busTypes: list, amenities: list }, [
    requireRole('ADMIN', 'SUPER_ADMIN'),
  ]),
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

test('fleet administration reads require staff and disable response caching', async () => {
  for (const resource of ['bus-types', 'amenities']) {
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

test('both fleet lists reject invalid and unknown filters before calling services', async () => {
  for (const resource of ['bus-types', 'amenities']) {
    const count = calls.length;
    for (const query of [
      'limit=0',
      'limit=101',
      'offset=-1',
      'offset=100001',
      'locale=de',
      'search[]=x',
      'unknown=x',
      'search=' + 'x'.repeat(201),
    ]) {
      const response = await fetch(`${base}/${resource}?${query}`, {
        headers: { 'x-test-role': 'ADMIN' },
      });
      assert.equal(response.status, 400, query);
    }
    assert.equal(calls.length, count);
    const response = await fetch(
      `${base}/${resource}?search=%20VIP%20&locale=ar&limit=5&offset=20`,
      { headers: { 'x-test-role': 'ADMIN' } },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(calls.at(-1), {
      search: 'VIP',
      locale: 'ar',
      limit: 5,
      offset: 20,
    });
  }
});

test('existing fleet pagination contract does not gain admin filters', () => {
  assert(
    fleetMetadataListSchema.safeParse({ limit: '20', offset: '0' }).success,
  );
  assert.equal(
    fleetMetadataListSchema.safeParse({ search: 'VIP' }).success,
    false,
  );
});

// The runner owns this disposable database; application URLs are refused.
const url = process.env.CATALOG_TEST_DATABASE_URL;
if (url) {
  const target = new URL(url);
  assert.equal(target.hostname, '127.0.0.1');
  assert.equal(target.port, '18985');
  assert.equal(target.pathname, '/catalog_test');
}
const db = url ? postgres<Contract>({ contractJson, url }) : null;
const service = db ? createAdminFleetService(db) : null;
before(async () => {
  if (!db) return;
  await db
    .runtime()
    .execute(
      db.raw
        .sql`CREATE TABLE "public"."BusType" ("id" text PRIMARY KEY, "code" text NOT NULL, "nameAr" text NOT NULL, "nameEn" text NOT NULL)`
        .affectedCount()
        .build(),
    );
  await db
    .runtime()
    .execute(
      db.raw
        .sql`CREATE TABLE "public"."Amenity" ("id" text PRIMARY KEY, "code" text NOT NULL, "nameAr" text NOT NULL, "nameEn" text NOT NULL)`
        .affectedCount()
        .build(),
    );
  await db
    .runtime()
    .execute(
      db.raw
        .sql`INSERT INTO "public"."BusType" SELECT '40000000-0000-4000-8000-' || lpad(i::text,12,'0'), 'TYPE_' || i, CASE WHEN i=1 THEN 'اقتصادي' WHEN i=2 THEN 'فاخر' ELSE 'نوع ' || i END, CASE WHEN i=1 THEN 'Zeta' WHEN i=2 THEN 'Alpha' ELSE 'Type ' || lpad(i::text,2,'0') END FROM generate_series(1,25) i`
        .affectedCount()
        .build(),
    );
  await db
    .runtime()
    .execute(
      db.raw
        .sql`INSERT INTO "public"."Amenity" SELECT "id", replace("code", 'TYPE_', 'AMENITY_'), "nameAr", "nameEn" FROM "public"."BusType"`
        .affectedCount()
        .build(),
    );
  await db
    .runtime()
    .execute(
      db.raw
        .sql`INSERT INTO "public"."Amenity" VALUES ('40000000-0000-4000-8000-000000000026', 'PERCENT', 'نسبة', '100% literal')`
        .affectedCount()
        .build(),
    );
});
after(async () => {
  await db?.close();
});
const sqlOptions = { skip: !db };

test(
  'SQL fleet paging preserves totals, disjoint pages and out-of-range totals',
  sqlOptions,
  async () => {
    for (const method of ['busTypes', 'amenities'] as const) {
      const expected = method === 'busTypes' ? 25 : 26;
      const first = await service![method](adminFleetListQuerySchema.parse({}));
      const second = await service![method](
        adminFleetListQuerySchema.parse({ offset: '20' }),
      );
      assert.equal(first.items.length, 20);
      assert.equal(second.items.length, expected - 20);
      assert.equal(first.total, expected);
      assert.equal(second.total, expected);
      assert.equal(
        new Set([...first.items, ...second.items].map((row) => row.id)).size,
        expected,
      );
      const empty = await service![method](
        adminFleetListQuerySchema.parse({ offset: '100' }),
      );
      assert.deepEqual(empty.items, []);
      assert.equal(empty.total, expected);
    }
  },
);

test(
  'SQL fleet search matches Arabic, English and case-insensitive codes',
  sqlOptions,
  async () => {
    for (const method of ['busTypes', 'amenities'] as const) {
      for (const search of [
        'اقتصادي',
        'zETA',
        method === 'busTypes' ? 'type_25' : 'amenity_25',
      ]) {
        const page = await service![method](
          adminFleetListQuerySchema.parse({ search }),
        );
        assert.equal(page.total, 1, method + ':' + search);
        assert.equal(page.items.length, 1);
      }
    }
  },
);

test(
  'SQL fleet search treats wildcards and SQL text literally',
  sqlOptions,
  async () => {
    assert.equal(
      (
        await service!.amenities(
          adminFleetListQuerySchema.parse({ search: '%' }),
        )
      ).total,
      1,
    );
    for (const method of ['busTypes', 'amenities'] as const) {
      assert.equal(
        (
          await service![method](
            adminFleetListQuerySchema.parse({ search: "%' OR 1=1 --" }),
          )
        ).total,
        0,
      );
      assert.equal(
        (
          await service![method](
            adminFleetListQuerySchema.parse({ search: '_' }),
          )
        ).total,
        25,
      );
    }
  },
);

test(
  'SQL fleet ordering is stable and follows requested name locale',
  sqlOptions,
  async () => {
    for (const method of ['busTypes', 'amenities'] as const) {
      const en = await service![method](
        adminFleetListQuerySchema.parse({ locale: 'en' }),
      );
      const ar = await service![method](
        adminFleetListQuerySchema.parse({ locale: 'ar' }),
      );
      assert.notDeepEqual(
        en.items.map((row) => row.id),
        ar.items.map((row) => row.id),
      );
      assert.deepEqual(
        (
          await service![method](
            adminFleetListQuerySchema.parse({ locale: 'ar' }),
          )
        ).items,
        ar.items,
      );
    }
  },
);
