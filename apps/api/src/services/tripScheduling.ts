import type { db as database } from '../prisma/db.ts';
import { AppError } from '../errors/AppError.ts';

type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
type Interval = { busId: string; departureAt: string; arrivalAt: string };
// Single and batch writes share this lock order and the same eligibility rules.
export async function lockTripParents(
  tx: Transaction,
  db: typeof database,
  input: { routeId: string; busId: string },
  requireActive = true,
) {
  await tx.execute(
    db.raw
      .sql`SELECT "id" FROM "public"."Route" WHERE "id" = ${input.routeId} FOR SHARE`
      .affectedCount()
      .build(),
  );
  const route = await tx.orm.public.Route.where({ id: input.routeId }).first();
  if (!route) throw new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found');
  await tx.execute(
    db.raw
      .sql`SELECT "id" FROM "public"."Bus" WHERE "id" = ${input.busId} FOR UPDATE`
      .affectedCount()
      .build(),
  );
  const bus = await tx.orm.public.Bus.where({ id: input.busId }).first();
  if (!bus) throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
  if (requireActive && !route.isActive)
    throw new AppError(
      409,
      'ROUTE_INACTIVE',
      'Scheduled trips require an active route',
    );
  if (requireActive && !bus.isActive)
    throw new AppError(
      409,
      'BUS_INACTIVE',
      'Scheduled trips require an active bus',
    );
}
export function scheduledTripsInInterval(
  tx: Transaction,
  input: Interval,
  excludeId?: string,
) {
  const query = tx.orm.public.Trip.where({
    busId: input.busId,
    status: 'SCHEDULED',
  })
    .where((trip) => trip.departureAt.lt(input.arrivalAt))
    .where((trip) => trip.arrivalAt.gt(input.departureAt));
  return excludeId ? query.where((trip) => trip.id.neq(excludeId)) : query;
}
export function intervalsOverlap(
  a: { departureAt: string; arrivalAt: string },
  b: { departureAt: string; arrivalAt: string },
) {
  return (
    Date.parse(a.departureAt) < Date.parse(b.arrivalAt) &&
    Date.parse(a.arrivalAt) > Date.parse(b.departureAt)
  );
}
