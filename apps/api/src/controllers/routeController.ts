import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import type { RouteService } from '../services/routeService.ts';
import {
  routeIdSchema,
  routeListQuerySchema,
  createRouteSchema,
  updateRouteSchema,
} from '../schemas/routeSchema.ts';

export function createRouteController(service: RouteService) {
  return {
    async list(request: Request, response: Response) {
      const query = routeListQuerySchema.safeParse(request.query);
      if (!query.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use limit 1-100, offset 0-100000, optional originStationId/destinationStationId UUIDs and isActive true/false; no other query fields are supported',
        );
      }
      const { items, total } = await service.list(query.data);
      sendSuccess(response, {
        items,
        total,
        pagination: { limit: query.data.limit, offset: query.data.offset },
      });
    },
    async getById(request: Request, response: Response) {
      const id = routeIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Route id must be a valid UUID',
        );
      }
      const route = await service.findById(id.data);
      if (!route) {
        throw new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found');
      }
      sendSuccess(response, route);
    },
    async create(request: Request, response: Response) {
      if (!request.is('application/json')) {
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      }
      const input = createRouteSchema.safeParse(request.body);
      if (!input.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide distinct originStationId/destinationStationId UUIDs, estimatedDurationMinutes (integer 1-10080), and optional isActive (boolean)',
        );
      }
      const route = await service.create(input.data);
      sendSuccess(
        response.location('/api/v1/routes/' + route.id).status(201),
        route,
      );
    },
    async update(request: Request, response: Response) {
      const id = routeIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Route id must be a valid UUID',
        );
      }
      if (!request.is('application/json')) {
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      }
      const input = updateRouteSchema.safeParse(request.body);
      if (!input.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide at least one valid route field: originStationId/destinationStationId (distinct UUIDs), estimatedDurationMinutes (integer 1-10080), or isActive (boolean)',
        );
      }
      const route = await service.update(id.data, input.data);
      if (!route) {
        throw new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found');
      }
      sendSuccess(response, route);
    },
    async remove(request: Request, response: Response) {
      const id = routeIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Route id must be a valid UUID',
        );
      }
      const route = await service.remove(id.data);
      if (!route) {
        throw new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found');
      }
      sendSuccess(response);
    },
  };
}
