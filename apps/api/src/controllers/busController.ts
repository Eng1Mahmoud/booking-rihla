import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import type { BusService } from '../services/busService.ts';
import {
  busIdSchema,
  busListQuerySchema,
  createBusSchema,
  updateBusSchema,
} from '../schemas/busSchema.ts';

export function createBusController(service: BusService) {
  return {
    async list(request: Request, response: Response) {
      const query = busListQuerySchema.safeParse(request.query);
      if (!query.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use limit 1-100, offset 0-100000, and optional isActive=true/false; no other query fields are supported',
        );
      }
      const buses = await service.list(query.data);
      response.json({ data: buses, pagination: query.data });
    },
    async getById(request: Request, response: Response) {
      const id = busIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Bus id must be a valid UUID',
        );
      }
      const bus = await service.findById(id.data);
      if (!bus) {
        throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
      }
      response.json({ data: bus });
    },
    async listSeats(request: Request, response: Response) {
      const id = busIdSchema.safeParse(request.params.id);
      if (!id.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Bus id must be a valid UUID',
        );
      const seats = await service.listSeats(id.data);
      if (!seats) throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
      response.json({ data: seats });
    },
    async create(request: Request, response: Response) {
      if (!request.is('application/json')) {
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      }
      const input = createBusSchema.safeParse(request.body);
      if (!input.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide plateNumber (1-32 characters), seatCount (integer 1-100), and optional isActive (boolean)',
        );
      }
      const bus = await service.create(input.data);
      response
        .location('/api/v1/buses/' + bus.id)
        .status(201)
        .json({ data: bus });
    },
    async update(request: Request, response: Response) {
      const id = busIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Bus id must be a valid UUID',
        );
      }
      if (!request.is('application/json')) {
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      }
      const input = updateBusSchema.safeParse(request.body);
      if (!input.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide plateNumber (1-32 characters), seatCount (integer 1-100), or isActive (boolean); no other fields are allowed',
        );
      }
      const bus = await service.update(id.data, input.data);
      if (!bus) {
        throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
      }
      response.json({ data: bus });
    },
    async remove(request: Request, response: Response) {
      const id = busIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Bus id must be a valid UUID',
        );
      }
      const bus = await service.remove(id.data);
      if (!bus) {
        throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
      }
      response.status(204).end();
    },
  };
}
