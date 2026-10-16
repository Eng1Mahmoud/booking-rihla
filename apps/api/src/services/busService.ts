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

export type Bus = CreateBusInput & { id: string };
export interface BusSeat {
  id: string;
  busId: string;
  number: number;
}

export const busService = {
  async list({ limit, offset, isActive }: BusListQuery): Promise<Bus[]> {
    const { db } = await import('../prisma/db.ts');
    const query =
      isActive === undefined
        ? db.orm.public.Bus
        : db.orm.public.Bus.where({ isActive });
    return await query
      .orderBy([(bus) => bus.plateNumber.asc(), (bus) => bus.id.asc()])
      .limit(limit)
      .offset(offset)
      .all();
  },
  async findById(id: string): Promise<Bus | null> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.Bus.where({ id }).first();
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
        const bus = await tx.orm.public.Bus.create(input);
        await tx.orm.public.BusSeat.createAll(
          Array.from({ length: bus.seatCount }, (_, index) => ({
            busId: bus.id,
            number: index + 1,
          })),
        );
        return bus;
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
        return await tx.orm.public.Bus.where({ id }).update(input);
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
  async remove(id: string): Promise<Bus | null> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.orm.public.Bus.where({ id }).delete();
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
