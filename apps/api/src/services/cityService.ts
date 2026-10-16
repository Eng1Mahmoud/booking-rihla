import type { CreateCityInput, CityListQuery } from '../schemas/citySchema.ts';

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
  async create(input: CreateCityInput): Promise<City> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.City.create(input);
  },
};

export type CityService = typeof cityService;
