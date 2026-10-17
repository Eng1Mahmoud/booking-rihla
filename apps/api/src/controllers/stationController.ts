import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import type { StationService } from '../services/stationService.ts';
import {
  stationIdSchema,
  stationListQuerySchema,
  createStationSchema,
  updateStationSchema,
} from '../schemas/stationSchema.ts';

export function createStationController(service: StationService) {
  return {
    async list(request: Request, response: Response) {
      const query = stationListQuerySchema.safeParse(request.query);
      if (!query.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use limit 1-100, offset 0-100000, and an optional cityId UUID; no other query fields are supported',
        );
      }
      const stations = await service.list(query.data);
      response.json({ data: stations, pagination: query.data });
    },
    async getById(request: Request, response: Response) {
      const id = stationIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Station id must be a valid UUID',
        );
      }
      const station = await service.findById(id.data);
      if (!station) {
        throw new AppError(404, 'STATION_NOT_FOUND', 'Station not found');
      }
      response.json({ data: station });
    },
    async create(request: Request, response: Response) {
      if (!request.is('application/json')) {
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      }
      const input = createStationSchema.safeParse(request.body);
      if (!input.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only nameAr/nameEn (1-100 characters after trimming) and a cityId UUID',
        );
      }
      const station = await service.create(input.data, response.locals.auth);
      response
        .location('/api/v1/stations/' + station.id)
        .status(201)
        .json({ data: station });
    },
    async update(request: Request, response: Response) {
      const id = stationIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Station id must be a valid UUID',
        );
      }
      if (!request.is('application/json')) {
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      }
      const input = updateStationSchema.safeParse(request.body);
      if (!input.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide at least one of nameAr/nameEn (1-100 characters) or cityId (UUID); no other fields are allowed',
        );
      }
      const station = await service.update(
        id.data,
        input.data,
        response.locals.auth,
      );
      if (!station) {
        throw new AppError(404, 'STATION_NOT_FOUND', 'Station not found');
      }
      response.json({ data: station });
    },
    async remove(request: Request, response: Response) {
      const id = stationIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Station id must be a valid UUID',
        );
      }
      const station = await service.remove(id.data, response.locals.auth);
      if (!station) {
        throw new AppError(404, 'STATION_NOT_FOUND', 'Station not found');
      }
      response.status(204).end();
    },
  };
}
