import { buildEgyptCatalog } from './egyptCatalog.ts';

export async function seedEgyptCatalog(reset = false) {
  if (!['development', 'test'].includes(process.env.NODE_ENV ?? 'development'))
    throw new Error('Development seed is disabled in production');
  if (reset) {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.pathname !== '/bus_platform'
    )
      throw new Error(
        'Reset is restricted to the local bus_platform development database',
      );
  }
  const { db } = await import('../prisma/db.ts');
  const data = buildEgyptCatalog();
  await db.transaction(async (tx) => {
    await tx.execute(
      db.raw.sql`SELECT pg_advisory_xact_lock(18411, 1)`
        .affectedCount()
        .build(),
    );
    if (reset)
      await tx.execute(
        db.raw.sql`TRUNCATE TABLE
      public."BookingNotice", public."Refund", public."Ticket", public."PaymentSettlement",
      public."PaymentSession", public."PaymentAttempt", public."PaymentEvent",
      public."BookingSeat", public."Booking", public."AuditLog",
      public."RefreshToken", public."Session", public."PasswordReset",
      public."EmailOutbox", public."EmailVerification", public."User",
      public."Trip", public."Route", public."BusAmenity", public."BusSeat",
      public."Bus", public."BusType", public."Amenity", public."Station", public."City"
      RESTART IDENTITY`
          .affectedCount()
          .build(),
      );
    for (const row of data.cities)
      if (!(await tx.orm.public.City.where({ id: row.id }).first()))
        await tx.orm.public.City.create(row);
    for (const row of data.stations)
      if (!(await tx.orm.public.Station.where({ id: row.id }).first()))
        await tx.orm.public.Station.create(row);
    for (const row of data.busTypes)
      if (!(await tx.orm.public.BusType.where({ id: row.id }).first()))
        await tx.orm.public.BusType.create(row);
    for (const row of data.amenities)
      if (!(await tx.orm.public.Amenity.where({ id: row.id }).first()))
        await tx.orm.public.Amenity.create(row);
    for (const row of data.buses)
      if (!(await tx.orm.public.Bus.where({ id: row.id }).first()))
        await tx.orm.public.Bus.create(row);
    for (const row of data.seats)
      if (!(await tx.orm.public.BusSeat.where({ id: row.id }).first()))
        await tx.orm.public.BusSeat.create(row);
    for (const row of data.busAmenities)
      if (!(await tx.orm.public.BusAmenity.where({ id: row.id }).first()))
        await tx.orm.public.BusAmenity.create(row);
    for (const row of data.routes)
      if (!(await tx.orm.public.Route.where({ id: row.id }).first()))
        await tx.orm.public.Route.create(row);
    for (const row of data.trips)
      if (!(await tx.orm.public.Trip.where({ id: row.id }).first()))
        await tx.orm.public.Trip.create(row);
  });
  return {
    cities: data.cities.length,
    stations: data.stations.length,
    buses: data.buses.length,
    trips: data.trips.length,
    dates: [data.dates[0], data.dates.at(-1)],
  };
}
