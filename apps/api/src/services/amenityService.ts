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
  if (isUniqueViolation(error, 'Amenity_code_key'))
    throw new AppError(
      409,
      'AMENITY_CODE_EXISTS',
      'Amenity code already exists',
    );
  if (isForeignKeyViolation(error) || isRestrictViolation(error))
    throw new AppError(409, 'AMENITY_IN_USE', 'Amenity is assigned to a bus');
  throw error;
}
export const amenityService = {
  async list({ limit, offset }: FleetMetadataQuery): Promise<FleetMetadata[]> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.Amenity.orderBy([
      (item) => item.code.asc(),
      (item) => item.id.asc(),
    ])
      .limit(limit)
      .offset(offset)
      .all();
  },
  async findById(id: string): Promise<FleetMetadata | null> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.Amenity.where({ id }).first();
  },
  async create(input: FleetMetadataInput): Promise<FleetMetadata> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.transaction(async (tx) => {
        const saved = await tx.orm.public.Amenity.create(input);
        return saved;
      });
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
            .sql`SELECT "id" FROM "public"."Amenity" WHERE "id" = ${id} FOR UPDATE`
            .affectedCount()
            .build(),
        );
        const current = await tx.orm.public.Amenity.where({ id }).first();
        if (!current) return null;
        if (
          Object.entries(input).some(
            ([key, value]) => value !== current[key as keyof FleetMetadata],
          ) &&
          (await tx.orm.public.Booking.where((booking) =>
            booking.trip.some((trip) =>
              trip.bus.some((bus) => bus.amenityLinks.some({ amenityId: id })),
            ),
          ).first())
        )
          throw new AppError(
            409,
            'AMENITY_HAS_BOOKINGS',
            'Amenity used by a reserved bus cannot change',
          );
        const saved = await tx.orm.public.Amenity.where({ id }).update(input);
        return saved;
      });
    } catch (error) {
      writeError(error);
    }
  },
  async remove(id: string): Promise<FleetMetadata | null> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.transaction(async (tx) => {
        const removed = await tx.orm.public.Amenity.where({ id }).delete();
        return removed;
      });
    } catch (error) {
      writeError(error);
    }
  },
};
export type AmenityService = typeof amenityService;
