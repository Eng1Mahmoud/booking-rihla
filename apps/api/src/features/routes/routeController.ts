import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import { routeService } from './routeService.ts';
import {
  routeIdSchema,
  routeListQuerySchema,
  createRouteSchema,
  updateRouteSchema,
} from './routeSchema.ts';
import { parseInput, requireJson } from '../../shared/requestValidation.ts';

export const routeController = {
  async list(request: Request, response: Response) {
    const query = parseInput(
      routeListQuerySchema,
      request.query,
      'Use limit 1-100, offset 0-100000, optional originStationId/destinationStationId UUIDs and isActive true/false; no other query fields are supported',
    );
    const { items, total } = await routeService.list(query);
    sendSuccess(response, {
      items,
      total,
      pagination: { limit: query.limit, offset: query.offset },
    });
  },
  async getById(request: Request, response: Response) {
    const id = parseInput(
      routeIdSchema,
      request.params.id,
      'Route id must be a valid UUID',
    );
    const route = await routeService.findById(id);
    if (!route) {
      throw new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found');
    }
    sendSuccess(response, route);
  },
  async create(request: Request, response: Response) {
    requireJson(request);
    const input = parseInput(
      createRouteSchema,
      request.body,
      'Provide distinct originStationId/destinationStationId UUIDs, estimatedDurationMinutes (integer 1-10080), and optional isActive (boolean)',
    );
    const route = await routeService.create(input);
    sendSuccess(
      response.location('/api/v1/routes/' + route.id).status(201),
      route,
    );
  },
  async update(request: Request, response: Response) {
    const id = parseInput(
      routeIdSchema,
      request.params.id,
      'Route id must be a valid UUID',
    );
    requireJson(request);
    const input = parseInput(
      updateRouteSchema,
      request.body,
      'Provide at least one valid route field: originStationId/destinationStationId (distinct UUIDs), estimatedDurationMinutes (integer 1-10080), or isActive (boolean)',
    );
    const route = await routeService.update(id, input);
    if (!route) {
      throw new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found');
    }
    sendSuccess(response, route);
  },
  async remove(request: Request, response: Response) {
    const id = parseInput(
      routeIdSchema,
      request.params.id,
      'Route id must be a valid UUID',
    );
    const route = await routeService.remove(id);
    if (!route) {
      throw new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found');
    }
    sendSuccess(response);
  },
};
