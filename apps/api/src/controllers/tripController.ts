import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import type { TripService } from '../services/tripService.ts';
import {
  tripIdSchema,
  tripListQuerySchema,
  createTripSchema,
  updateTripSchema,
} from '../schemas/tripSchema.ts';

export function createTripController(service: TripService) {
  return {
    async list(request: Request, response: Response) {
      const query = tripListQuerySchema.safeParse(request.query);
      if (!query.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use limit 1-100, offset 0-100000, optional routeId/busId UUIDs and status SCHEDULED/CANCELLED; no other query fields are supported',
        );
      }
      const trips = await service.list(query.data);
      sendSuccess(response, { items: trips, pagination: query.data });
    },
    async getById(request: Request, response: Response) {
      const id = tripIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Trip id must be a valid UUID',
        );
      }
      const trip = await service.findById(id.data);
      if (!trip) {
        throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found');
      }
      sendSuccess(response, trip);
    },
    async create(request: Request, response: Response) {
      if (!request.is('application/json')) {
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      }
      const input = createTripSchema.safeParse(request.body);
      if (!input.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide routeId/busId UUIDs, departureAt/arrivalAt with timezone and arrival after departure, pricePiastres (integer 0-2147483647), and optional status SCHEDULED/CANCELLED',
        );
      }
      const trip = await service.create(input.data, response.locals.auth);
      sendSuccess(
        response.location('/api/v1/trips/' + trip.id).status(201),
        trip,
      );
    },
    async update(request: Request, response: Response) {
      const id = tripIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Trip id must be a valid UUID',
        );
      }
      if (!request.is('application/json')) {
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      }
      const input = updateTripSchema.safeParse(request.body);
      if (!input.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide at least one supported trip field with valid UUIDs, timezone timestamps (arrival after departure), integer pricePiastres 0-2147483647, or status SCHEDULED/CANCELLED',
        );
      }
      const trip = await service.update(
        id.data,
        input.data,
        response.locals.auth,
      );
      if (!trip) {
        throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found');
      }
      sendSuccess(response, trip);
    },
    async remove(request: Request, response: Response) {
      const id = tripIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Trip id must be a valid UUID',
        );
      }
      const trip = await service.remove(id.data, response.locals.auth);
      if (!trip) {
        throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found');
      }
      sendSuccess(response);
    },
  };
}
