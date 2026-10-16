import { AppError } from '../errors/AppError.ts';
import {
  isUniqueViolation,
  isForeignKeyViolation,
  isRestrictViolation,
} from '../utils/databaseErrors.ts';
import type {
  FleetMetadata,
  FleetMetadataInput,
  FleetMetadataUpdate,
  FleetMetadataQuery,
} from '../schemas/fleetMetadataSchema.ts';
function writeError(error: unknown): never {
  if (isUniqueViolation(error, 'BusType_code_key'))
    throw new AppError(
      409,
      'BUS_TYPE_CODE_EXISTS',
      'Bus type code already exists',
    );
  if (isForeignKeyViolation(error) || isRestrictViolation(error))
    throw new AppError(409, 'BUS_TYPE_IN_USE', 'Bus type is assigned to a bus');
  throw error;
}
export const busTypeService = {
  async list({ limit, offset }: FleetMetadataQuery): Promise<FleetMetadata[]> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.BusType.orderBy([
      (item) => item.code.asc(),
      (item) => item.id.asc(),
    ])
      .limit(limit)
      .offset(offset)
      .all();
  },
  async findById(id: string): Promise<FleetMetadata | null> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.BusType.where({ id }).first();
  },
  async create(input: FleetMetadataInput): Promise<FleetMetadata> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.orm.public.BusType.create(input);
    } catch (error) {
      writeError(error);
    }
  },
  async update(
    id: string,
    input: FleetMetadataUpdate,
  ): Promise<FleetMetadata | null> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.transaction(async (tx) => {
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."BusType" WHERE "id" = ${id} FOR UPDATE`
            .affectedCount()
            .build(),
        );
        const current = await tx.orm.public.BusType.where({ id }).first();
        if (!current) return null;
        if (
          Object.entries(input).some(
            ([key, value]) => value !== current[key as keyof FleetMetadata],
          ) &&
          (await tx.orm.public.Booking.where((booking) =>
            booking.trip.some((trip) => trip.bus.some({ busTypeId: id })),
          ).first())
        )
          throw new AppError(
            409,
            'BUS_TYPE_HAS_BOOKINGS',
            'Bus type used by a reserved bus cannot change',
          );
        return await tx.orm.public.BusType.where({ id }).update(input);
      });
    } catch (error) {
      writeError(error);
    }
  },
  async remove(id: string): Promise<FleetMetadata | null> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.orm.public.BusType.where({ id }).delete();
    } catch (error) {
      writeError(error);
    }
  },
};
export type BusTypeService = typeof busTypeService;
