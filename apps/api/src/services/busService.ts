import { busMetadata } from '../utils/busMetadata.ts';
import type { FleetMetadata } from '../schemas/fleetMetadataSchema.ts';
import type { db as database } from '../prisma/db.ts';
import { AppError } from '../errors/AppError.ts';
import {
  isUniqueViolation,
  isForeignKeyViolation,
  isRestrictViolation,
} from '../utils/databaseErrors.ts';
import type {
  CreateBusInput,
  UpdateBusInput,
  BusListQuery,
} from '../schemas/busSchema.ts';

export interface Bus {
  id: string;
  plateNumber: string;
  seatCount: number;
  isActive: boolean;
  busTypeId: string | null;
  busType: FleetMetadata | null;
  amenities: FleetMetadata[];
}
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
function buses(client: Pick<typeof database, 'orm'>) {
  return client.orm.public.Bus.include('busType').include(
    'amenityLinks',
    (links) => links.include('amenity'),
  );
}
type BusRecord = NonNullable<
  Awaited<ReturnType<ReturnType<typeof buses>['first']>>
>;
function serializeBus(bus: BusRecord): Bus {
  return {
    id: bus.id,
    plateNumber: bus.plateNumber,
    seatCount: bus.seatCount,
    isActive: bus.isActive,
    busTypeId: bus.busTypeId,
    ...busMetadata(bus),
  };
}
async function lockMetadata(
  tx: Transaction,
  db: typeof database,
  busTypeId: string | null | undefined,
  amenityIds: string[] | undefined,
) {
  if (busTypeId) {
    await tx.execute(
      db.raw
        .sql`SELECT "id" FROM "public"."BusType" WHERE "id" = ${busTypeId} FOR SHARE`
        .affectedCount()
        .build(),
    );
    if (!(await tx.orm.public.BusType.where({ id: busTypeId }).first()))
      throw new AppError(404, 'BUS_TYPE_NOT_FOUND', 'Bus type not found');
  }
  for (const id of [...(amenityIds ?? [])].sort()) {
    await tx.execute(
      db.raw
        .sql`SELECT "id" FROM "public"."Amenity" WHERE "id" = ${id} FOR SHARE`
        .affectedCount()
        .build(),
    );
    if (!(await tx.orm.public.Amenity.where({ id }).first()))
      throw new AppError(404, 'AMENITY_NOT_FOUND', 'Amenity not found');
  }
}

export interface BusSeat {
  id: string;
  busId: string;
  number: number;
}

export const busService = {
  async list({
    limit,
    offset,
    isActive,
    busTypeId,
  }: BusListQuery): Promise<Bus[]> {
    const { db } = await import('../prisma/db.ts');
    const rows = await buses(db)
      .where({
        ...(isActive === undefined ? {} : { isActive }),
        ...(busTypeId === undefined ? {} : { busTypeId }),
      })
      .orderBy([(bus) => bus.plateNumber.asc(), (bus) => bus.id.asc()])
      .limit(limit)
      .offset(offset)
      .all();
    return rows.map(serializeBus);
  },
  async findById(id: string): Promise<Bus | null> {
    const { db } = await import('../prisma/db.ts');
    const row = await buses(db).where({ id }).first();
    return row ? serializeBus(row) : null;
  },
  async listSeats(id: string): Promise<BusSeat[] | null> {
    const { db } = await import('../prisma/db.ts');
    if (!(await db.orm.public.Bus.where({ id }).first())) return null;
    return await db.orm.public.BusSeat.where({ busId: id })
      .orderBy((seat) => seat.number.asc())
      .all();
  },
  async create(input: CreateBusInput): Promise<Bus> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.transaction(async (tx) => {
        const { amenityIds, ...fields } = input;
        await lockMetadata(tx, db, fields.busTypeId, amenityIds);
        const bus = await tx.orm.public.Bus.create(fields);
        if (amenityIds?.length)
          await tx.orm.public.BusAmenity.createAll(
            amenityIds.map((amenityId) => ({ busId: bus.id, amenityId })),
          );
        await tx.orm.public.BusSeat.createAll(
          Array.from({ length: bus.seatCount }, (_, index) => ({
            busId: bus.id,
            number: index + 1,
          })),
        );
        const result = await buses(tx).where({ id: bus.id }).first();
        if (!result) throw new Error('Bus creation returned no row');
        return serializeBus(result);
      });
    } catch (error) {
      if (isUniqueViolation(error, 'Bus_plateNumber_key'))
        throw new AppError(
          409,
          'PLATE_NUMBER_EXISTS',
          'A bus with this plate number already exists',
        );
      throw error;
    }
  },
  async update(id: string, input: UpdateBusInput): Promise<Bus | null> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.transaction(async (tx) => {
        // Serialize capacity edits for this bus so its count and numbered seats agree.
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."Bus" WHERE "id" = ${id} FOR UPDATE`
            .affectedCount()
            .build(),
        );
        const bus = await tx.orm.public.Bus.where({ id }).first();
        if (!bus) return null;
        const { amenityIds, ...fields } = input;
        const links = await tx.orm.public.BusAmenity.where({ busId: id }).all();
        const changedAmenities =
          amenityIds !== undefined &&
          (links.length !== amenityIds.length ||
            links.some((link) => !amenityIds.includes(link.amenityId)));
        const changedType =
          fields.busTypeId !== undefined && fields.busTypeId !== bus.busTypeId;
        if (
          (changedAmenities || changedType) &&
          (await tx.orm.public.Booking.where((booking) =>
            booking.trip.some({ busId: id }),
          ).first())
        )
          throw new AppError(
            409,
            'BUS_HAS_BOOKINGS',
            'A bus with reservations cannot change its type or amenities',
          );
        await lockMetadata(tx, db, fields.busTypeId, amenityIds);
        const count = input.seatCount ?? bus.seatCount;
        if (
          count !== bus.seatCount &&
          (await tx.orm.public.Trip.where({ busId: id }).first())
        )
          throw new AppError(
            409,
            'BUS_HAS_TRIPS',
            'A bus used by trips cannot change its seat count',
          );
        if (
          count !== bus.seatCount &&
          (await tx.orm.public.BusLayout.where({ busId: id }).first())
        )
          throw new AppError(
            409,
            'BUS_HAS_LAYOUT',
            'Remove the unreserved layout before resizing its seats',
          );
        if (count > bus.seatCount) {
          await tx.orm.public.BusSeat.createAll(
            Array.from({ length: count - bus.seatCount }, (_, index) => ({
              busId: id,
              number: bus.seatCount + index + 1,
            })),
          );
        } else if (count < bus.seatCount) {
          await tx.orm.public.BusSeat.where({ busId: id })
            .where((seat) => seat.number.gt(count))
            .deleteAll();
        }
        if (Object.keys(fields).length)
          await tx.orm.public.Bus.where({ id }).update(fields);
        if (changedAmenities) {
          await tx.orm.public.BusAmenity.where({ busId: id }).deleteAll();
          if (amenityIds?.length)
            await tx.orm.public.BusAmenity.createAll(
              amenityIds.map((amenityId) => ({ busId: id, amenityId })),
            );
        }
        const result = await buses(tx).where({ id }).first();
        return result ? serializeBus(result) : null;
      });
    } catch (error) {
      if (isUniqueViolation(error, 'Bus_plateNumber_key'))
        throw new AppError(
          409,
          'PLATE_NUMBER_EXISTS',
          'A bus with this plate number already exists',
        );
      if (isForeignKeyViolation(error) || isRestrictViolation(error))
        throw new AppError(
          409,
          'BUS_IN_USE',
          'This bus or its seats are referenced by other records',
        );
      throw error;
    }
  },
  async remove(id: string): Promise<{ id: string } | null> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.transaction(async (tx) => {
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."Bus" WHERE "id" = ${id} FOR UPDATE`
            .affectedCount()
            .build(),
        );
        // Delete map cells first; a blocked bus deletion rolls this back as well.
        await tx.orm.public.BusLayout.where({ busId: id }).deleteAll();
        return await tx.orm.public.Bus.where({ id }).delete();
      });
    } catch (error) {
      if (isForeignKeyViolation(error) || isRestrictViolation(error))
        throw new AppError(
          409,
          'BUS_IN_USE',
          'This bus or its seats are referenced by other records',
        );
      throw error;
    }
  },
};
export type BusService = typeof busService;
