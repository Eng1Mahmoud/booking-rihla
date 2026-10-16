import { Temporal } from 'temporal-polyfill';
import { parseEnv } from '../config/env.ts';
import { buildDemoData } from './demoData.ts';
import { cairoToday } from '../utils/cairoTime.ts';

function assertSeedMatches(actual: object, expected: object) {
  for (const [key, value] of Object.entries(expected)) {
    const stored = (actual as Record<string, unknown>)[key];
    const matches =
      key === 'departureAt' || key === 'arrivalAt'
        ? Date.parse(String(stored)) === Date.parse(String(value))
        : stored === value;
    if (!matches)
      throw new Error(
        'Demo seed conflicts with edited or existing data; no changes were saved',
      );
  }
}
export async function seedDemo(
  firstDate = Temporal.PlainDate.from(cairoToday()).add({ days: 1 }).toString(),
  namespace = 'demo',
) {
  if (parseEnv(process.env).NODE_ENV === 'production')
    throw new Error('Demo seed is disabled in production');
  const data = buildDemoData(firstDate, namespace);
  const { db } = await import('../prisma/db.ts');
  await db.transaction(async (tx) => {
    // Serialize concurrent seed commands; ordinary API writes still use their own locks.
    await tx.execute(
      db.raw.sql`SELECT pg_advisory_xact_lock(18411, 1)`
        .affectedCount()
        .build(),
    );
    for (const row of data.cities) {
      const existing = await tx.orm.public.City.where({ id: row.id }).first();
      if (existing) assertSeedMatches(existing, row);
      else await tx.orm.public.City.create(row);
    }
    for (const row of data.stations) {
      const existing = await tx.orm.public.Station.where({
        id: row.id,
      }).first();
      if (existing) assertSeedMatches(existing, row);
      else await tx.orm.public.Station.create(row);
    }
    for (const row of data.routes) {
      const existing = await tx.orm.public.Route.where({ id: row.id }).first();
      if (existing) assertSeedMatches(existing, row);
      else await tx.orm.public.Route.create(row);
    }
    for (const row of data.buses) {
      const existing = await tx.orm.public.Bus.where({ id: row.id }).first();
      if (existing) assertSeedMatches(existing, row);
      else await tx.orm.public.Bus.create(row);
    }
    for (const row of data.seats) {
      const existing = await tx.orm.public.BusSeat.where({
        id: row.id,
      }).first();
      if (existing) assertSeedMatches(existing, row);
      else await tx.orm.public.BusSeat.create(row);
    }
    for (const row of data.trips) {
      const existing = await tx.orm.public.Trip.where({ id: row.id }).first();
      if (existing) assertSeedMatches(existing, row);
      else {
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."Route" WHERE "id" = ${row.routeId} FOR SHARE`
            .affectedCount()
            .build(),
        );
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."Bus" WHERE "id" = ${row.busId} FOR UPDATE`
            .affectedCount()
            .build(),
        );
        const lockedRoute = await tx.orm.public.Route.where({
          id: row.routeId,
        }).first();
        const lockedBus = await tx.orm.public.Bus.where({
          id: row.busId,
        }).first();
        const expectedRoute = data.routes.find(
          (route) => route.id === row.routeId,
        );
        const expectedBus = data.buses.find((bus) => bus.id === row.busId);
        if (!lockedRoute || !lockedBus || !expectedRoute || !expectedBus)
          throw new Error('Demo parent records changed');
        assertSeedMatches(lockedRoute, expectedRoute);
        assertSeedMatches(lockedBus, expectedBus);
        const conflict = await tx.orm.public.Trip.where({
          busId: row.busId,
          status: 'SCHEDULED',
        })
          .where((trip) => trip.departureAt.lt(row.arrivalAt))
          .where((trip) => trip.arrivalAt.gt(row.departureAt))
          .first();
        if (conflict)
          throw new Error(
            'Demo schedule conflicts with existing trips; no changes were saved',
          );
        await tx.orm.public.Trip.create(row);
      }
    }
  });
  return data;
}
