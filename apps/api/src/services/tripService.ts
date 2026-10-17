import { recordAudit, type AuditActor } from './auditWriter.ts';
import { lockTripParents, scheduledTripsInInterval } from './tripScheduling.ts';
import { AppError } from '../errors/AppError.ts';
import {
  isCheckViolation,
  isForeignKeyViolation,
  isRestrictViolation,
} from '../utils/databaseErrors.ts';
import type {
  CreateTripInput,
  UpdateTripInput,
  TripListQuery,
} from '../schemas/tripSchema.ts';

export type Trip = CreateTripInput & { id: string };
function serializeTrip(trip: Trip): Trip {
  return {
    ...trip,
    departureAt: new Date(trip.departureAt).toISOString(),
    arrivalAt: new Date(trip.arrivalAt).toISOString(),
  };
}
async function saveTrip(
  input: CreateTripInput | UpdateTripInput,
  id?: string,
  actor?: AuditActor,
): Promise<Trip | null> {
  const { db } = await import('../prisma/db.ts');
  try {
    return await db.transaction(async (tx) => {
      let current: Trip | null = null;
      if (id) {
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."Trip" WHERE "id" = ${id} FOR UPDATE`
            .affectedCount()
            .build(),
        );
        current = await tx.orm.public.Trip.where({ id }).first();
        if (!current) return null;
        if (Date.parse(current.departureAt) <= Date.now())
          throw new AppError(
            409,
            'TRIP_DEPARTED',
            'A departed trip cannot be edited',
          );
      }
      if (
        current &&
        Object.entries(input).some(([key, value]) => {
          const stored = current[key as keyof Trip];
          return key === 'departureAt' || key === 'arrivalAt'
            ? Date.parse(String(value)) !== Date.parse(String(stored))
            : value !== stored;
        }) &&
        (await tx.orm.public.Booking.where({ tripId: current.id }).first())
      )
        throw new AppError(
          409,
          'TRIP_HAS_BOOKINGS',
          'A trip with reservations cannot be changed',
        );
      const data = { ...current, ...input } as CreateTripInput;
      if (Date.parse(data.arrivalAt) <= Date.parse(data.departureAt))
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Arrival must be after departure',
        );
      if (Date.parse(data.departureAt) <= Date.now())
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Departure must be in the future',
        );
      await lockTripParents(tx, db, data, data.status === 'SCHEDULED');
      if (data.status === 'SCHEDULED') {
        const conflict = await scheduledTripsInInterval(tx, data, id).first();
        if (conflict)
          throw new AppError(
            409,
            'BUS_SCHEDULE_CONFLICT',
            'The bus already has a scheduled trip during this interval',
          );
      }
      // Send only supplied fields on PATCH, preserving omitted values and immutable id.
      const saved = id
        ? await tx.orm.public.Trip.where({ id }).update(input)
        : await tx.orm.public.Trip.create(data);
      if (saved) await recordAudit(tx, actor, 'Trip', saved.id, current, saved);
      return saved ? serializeTrip(saved) : null;
    });
  } catch (error) {
    if (isCheckViolation(error, 'trip_time_order_1a534dcc'))
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Arrival must be after departure',
      );
    if (isCheckViolation(error, 'trip_price_range_00e5e7c7'))
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Price must be integer piastres from 0 to 2147483647',
      );
    if (isForeignKeyViolation(error))
      throw new AppError(
        404,
        'TRIP_REFERENCE_NOT_FOUND',
        'Route or bus not found',
      );
    throw error;
  }
}
export const tripService = {
  async list({
    limit,
    offset,
    routeId,
    busId,
    status,
  }: TripListQuery): Promise<Trip[]> {
    const { db } = await import('../prisma/db.ts');
    const trips = await db.orm.public.Trip.where({
      ...(routeId === undefined ? {} : { routeId }),
      ...(busId === undefined ? {} : { busId }),
      ...(status === undefined ? {} : { status }),
    })
      .orderBy([(trip) => trip.departureAt.asc(), (trip) => trip.id.asc()])
      .limit(limit)
      .offset(offset)
      .all();
    return trips.map(serializeTrip);
  },
  async findById(id: string): Promise<Trip | null> {
    const { db } = await import('../prisma/db.ts');
    const trip = await db.orm.public.Trip.where({ id }).first();
    return trip ? serializeTrip(trip) : null;
  },
  async create(input: CreateTripInput, actor?: AuditActor): Promise<Trip> {
    const trip = await saveTrip(input, undefined, actor);
    if (!trip) throw new Error('Trip creation returned no row');
    return trip;
  },
  async update(
    id: string,
    input: UpdateTripInput,
    actor?: AuditActor,
  ): Promise<Trip | null> {
    return await saveTrip(input, id, actor);
  },
  async remove(id: string, actor?: AuditActor): Promise<Trip | null> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.transaction(async (tx) => {
        const trip = await tx.orm.public.Trip.where({ id }).delete();
        if (trip) await recordAudit(tx, actor, 'Trip', id, trip, null);
        return trip ? serializeTrip(trip) : null;
      });
    } catch (error) {
      if (isForeignKeyViolation(error) || isRestrictViolation(error))
        throw new AppError(
          409,
          'TRIP_IN_USE',
          'This trip is referenced by other records',
        );
      throw error;
    }
  },
};
export type TripService = typeof tripService;
