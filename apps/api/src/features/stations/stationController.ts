import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import { stationService } from './stationService.ts';
import {
  stationIdSchema,
  stationListQuerySchema,
  createStationSchema,
  updateStationSchema,
} from './stationSchema.ts';

export const stationController = {
  async list(request: Request, response: Response) {
    const query = stationListQuerySchema.safeParse(request.query);
    if (!query.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Use limit 1-100, offset 0-100000, and an optional cityId UUID; no other query fields are supported',
      );
    }
    const stations = await stationService.list(query.data);
    sendSuccess(response, { items: stations, pagination: query.data });
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
    const station = await stationService.findById(id.data);
    if (!station) {
      throw new AppError(404, 'STATION_NOT_FOUND', 'Station not found');
    }
    sendSuccess(response, station);
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
    const station = await stationService.create(input.data);
    sendSuccess(
      response.location('/api/v1/stations/' + station.id).status(201),
      station,
    );
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
    const station = await stationService.update(id.data, input.data);
    if (!station) {
      throw new AppError(404, 'STATION_NOT_FOUND', 'Station not found');
    }
    sendSuccess(response, station);
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
    const station = await stationService.remove(id.data);
    if (!station) {
      throw new AppError(404, 'STATION_NOT_FOUND', 'Station not found');
    }
    sendSuccess(response);
  },
};
