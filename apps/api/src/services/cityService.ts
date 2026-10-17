import { recordAudit, type AuditActor } from './auditWriter.ts';
import { AppError } from '../errors/AppError.ts';
import {
  isForeignKeyViolation,
  isRestrictViolation,
} from '../utils/databaseErrors.ts';
import type {
  CreateCityInput,
  CityListQuery,
  UpdateCityInput,
} from '../schemas/citySchema.ts';

export type City = CreateCityInput & { id: string };

// Load Prisma only for city operations; health checks do not need a database.
export const cityService = {
  async list({ limit, offset }: CityListQuery): Promise<City[]> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.City.orderBy([
      (city) => city.nameEn.asc(),
      (city) => city.id.asc(),
    ])
      .limit(limit)
      .offset(offset)
      .all();
  },
  async findById(id: string): Promise<City | null> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.City.where({ id }).first();
  },
  async create(input: CreateCityInput, actor?: AuditActor): Promise<City> {
    const { db } = await import('../prisma/db.ts');
    return await db.transaction(async (tx) => {
      const saved = await tx.orm.public.City.create(input);
      await recordAudit(tx, actor, 'City', saved.id, null, saved);
      return saved;
    });
  },
  async update(
    id: string,
    input: UpdateCityInput,
    actor?: AuditActor,
  ): Promise<City | null> {
    const { db } = await import('../prisma/db.ts');
    return await db.transaction(async (tx) => {
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."City" WHERE "id" = ${id} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      const before = await tx.orm.public.City.where({ id }).first();
      if (!before) return null;
      const saved = await tx.orm.public.City.where({ id }).update(input);
      await recordAudit(tx, actor, 'City', id, before, saved);
      return saved;
    });
  },
  async remove(id: string, actor?: AuditActor): Promise<City | null> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.transaction(async (tx) => {
        const removed = await tx.orm.public.City.where({ id }).delete();
        if (removed) await recordAudit(tx, actor, 'City', id, removed, null);
        return removed;
      });
    } catch (error) {
      if (isForeignKeyViolation(error) || isRestrictViolation(error)) {
        throw new AppError(
          409,
          'CITY_HAS_STATIONS',
          "Remove or move this city's stations before deleting it",
        );
      }
      throw error;
    }
  },
};

export type CityService = typeof cityService;
