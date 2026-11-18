import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import { tripService } from './tripService.ts';
import {
  tripIdSchema,
  tripListQuerySchema,
  createTripSchema,
  updateTripSchema,
} from './tripSchema.ts';
import { parseInput, requireJson } from '../../shared/requestValidation.ts';

export const tripController = {
  async list(request: Request, response: Response) {
    const query = parseInput(
      tripListQuerySchema,
      request.query,
      'Use limit 1-100, offset 0-100000, optional routeId/busId UUIDs and status SCHEDULED/CANCELLED; no other query fields are supported',
    );
    const { items, total } = await tripService.list(query);
    sendSuccess(response, {
      items,
      total,
      pagination: { limit: query.limit, offset: query.offset },
    });
  },
  async getById(request: Request, response: Response) {
    const id = parseInput(
      tripIdSchema,
      request.params.id,
      'Trip id must be a valid UUID',
    );
    const trip = await tripService.findById(id);
    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found');
    }
    sendSuccess(response, trip);
  },
  async create(request: Request, response: Response) {
    requireJson(request);
    const input = parseInput(
      createTripSchema,
      request.body,
      'Provide routeId/busId UUIDs, departureAt/arrivalAt with timezone and arrival after departure, pricePiastres (integer 0-2147483647), and optional status SCHEDULED/CANCELLED',
    );
    const trip = await tripService.create(input);
    sendSuccess(
      response.location('/api/v1/trips/' + trip.id).status(201),
      trip,
    );
  },
  async update(request: Request, response: Response) {
    const id = parseInput(
      tripIdSchema,
      request.params.id,
      'Trip id must be a valid UUID',
    );
    requireJson(request);
    const input = parseInput(
      updateTripSchema,
      request.body,
      'Provide at least one supported trip field with valid UUIDs, timezone timestamps (arrival after departure), integer pricePiastres 0-2147483647, or status SCHEDULED/CANCELLED',
    );
    const trip = await tripService.update(id, input);
    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found');
    }
    sendSuccess(response, trip);
  },
  async remove(request: Request, response: Response) {
    const id = parseInput(
      tripIdSchema,
      request.params.id,
      'Trip id must be a valid UUID',
    );
    const trip = await tripService.remove(id);
    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found');
    }
    sendSuccess(response);
  },
};
