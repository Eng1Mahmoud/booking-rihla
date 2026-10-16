import { AppError } from '../errors/AppError.ts';
import { isForeignKeyViolation } from '../utils/databaseErrors.ts';
import type {
  CreateStationInput,
  UpdateStationInput,
  StationListQuery,
} from '../schemas/stationSchema.ts';

export type Station = CreateStationInput & { id: string };

export const stationService = {
  async list({ limit, offset, cityId }: StationListQuery): Promise<Station[]> {
    const { db } = await import('../prisma/db.ts');
    const query = cityId
      ? db.orm.public.Station.where({ cityId })
      : db.orm.public.Station;
    return await query
      .orderBy([
        (station) => station.nameEn.asc(),
        (station) => station.id.asc(),
      ])
      .limit(limit)
      .offset(offset)
      .all();
  },
  async findById(id: string): Promise<Station | null> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.Station.where({ id }).first();
  },
  async create(input: CreateStationInput): Promise<Station> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.orm.public.Station.create(input);
    } catch (error) {
      if (isForeignKeyViolation(error))
        throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
      throw error;
    }
  },
  async update(id: string, input: UpdateStationInput): Promise<Station | null> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.orm.public.Station.where({ id }).update(input);
    } catch (error) {
      if (isForeignKeyViolation(error))
        throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
      throw error;
    }
  },
  async remove(id: string): Promise<Station | null> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.Station.where({ id }).delete();
  },
};
export type StationService = typeof stationService;
