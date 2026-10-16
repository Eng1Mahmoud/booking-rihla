import { AppError } from '../errors/AppError.ts';
import {
  isUniqueViolation,
  isForeignKeyViolation,
  isRestrictViolation,
  isCheckViolation,
} from '../utils/databaseErrors.ts';
import type {
  CreateRouteInput,
  UpdateRouteInput,
  RouteListQuery,
} from '../schemas/routeSchema.ts';

export type Route = CreateRouteInput & { id: string };
function handleWriteError(error: unknown): never {
  if (
    isUniqueViolation(error, 'Route_originStationId_destinationStationId_key')
  )
    throw new AppError(
      409,
      'ROUTE_EXISTS',
      'A route in this direction already exists',
    );
  if (isForeignKeyViolation(error))
    throw new AppError(
      404,
      'STATION_NOT_FOUND',
      'Origin or destination station not found',
    );
  // A partial update can make an endpoint equal the stored opposite endpoint.
  if (isCheckViolation(error, 'route_distinct_stations_0ade44e1'))
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Origin and destination stations must differ',
    );
  if (isCheckViolation(error, 'route_duration_range_c4fded6c'))
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Estimated duration must be 1-10080 whole minutes',
    );
  throw error;
}
export const routeService = {
  async list({
    limit,
    offset,
    originStationId,
    destinationStationId,
    isActive,
  }: RouteListQuery): Promise<Route[]> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.Route.where({
      ...(originStationId === undefined ? {} : { originStationId }),
      ...(destinationStationId === undefined ? {} : { destinationStationId }),
      ...(isActive === undefined ? {} : { isActive }),
    })
      .orderBy((route) => route.id.asc())
      .limit(limit)
      .offset(offset)
      .all();
  },
  async findById(id: string): Promise<Route | null> {
    const { db } = await import('../prisma/db.ts');
    return await db.orm.public.Route.where({ id }).first();
  },
  async create(input: CreateRouteInput): Promise<Route> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.orm.public.Route.create(input);
    } catch (error) {
      return handleWriteError(error);
    }
  },
  async update(id: string, input: UpdateRouteInput): Promise<Route | null> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.transaction(async (tx) => {
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."Route" WHERE "id" = ${id} FOR UPDATE`
            .affectedCount()
            .build(),
        );
        const current = await tx.orm.public.Route.where({ id }).first();
        if (!current) return null;
        const changesEndpoints =
          (input.originStationId !== undefined &&
            input.originStationId !== current.originStationId) ||
          (input.destinationStationId !== undefined &&
            input.destinationStationId !== current.destinationStationId);
        if (
          changesEndpoints &&
          (await tx.orm.public.Trip.where({ routeId: id }).first())
        )
          throw new AppError(
            409,
            'ROUTE_HAS_TRIPS',
            'A route used by trips cannot change its endpoints; create another route',
          );
        return await tx.orm.public.Route.where({ id }).update(input);
      });
    } catch (error) {
      return handleWriteError(error);
    }
  },
  async remove(id: string): Promise<Route | null> {
    const { db } = await import('../prisma/db.ts');
    try {
      return await db.orm.public.Route.where({ id }).delete();
    } catch (error) {
      if (isForeignKeyViolation(error) || isRestrictViolation(error))
        throw new AppError(
          409,
          'ROUTE_IN_USE',
          'This route is referenced by other records',
        );
      throw error;
    }
  },
};
export type RouteService = typeof routeService;
