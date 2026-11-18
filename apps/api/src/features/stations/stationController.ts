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
import { parseInput, requireJson } from '../../shared/requestValidation.ts';

export const stationController = {
  async list(request: Request, response: Response) {
    const query = parseInput(
      stationListQuerySchema,
      request.query,
      'Use limit 1-100, offset 0-100000, and an optional cityId UUID; no other query fields are supported',
    );
    const stations = await stationService.list(query);
    sendSuccess(response, { items: stations, pagination: query });
  },
  async getById(request: Request, response: Response) {
    const id = parseInput(
      stationIdSchema,
      request.params.id,
      'Station id must be a valid UUID',
    );
    const station = await stationService.findById(id);
    if (!station) {
      throw new AppError(404, 'STATION_NOT_FOUND', 'Station not found');
    }
    sendSuccess(response, station);
  },
  async create(request: Request, response: Response) {
    requireJson(request);
    const input = parseInput(
      createStationSchema,
      request.body,
      'Provide only nameAr/nameEn (1-100 characters after trimming) and a cityId UUID',
    );
    const station = await stationService.create(input);
    sendSuccess(
      response.location('/api/v1/stations/' + station.id).status(201),
      station,
    );
  },
  async update(request: Request, response: Response) {
    const id = parseInput(
      stationIdSchema,
      request.params.id,
      'Station id must be a valid UUID',
    );
    requireJson(request);
    const input = parseInput(
      updateStationSchema,
      request.body,
      'Provide at least one of nameAr/nameEn (1-100 characters) or cityId (UUID); no other fields are allowed',
    );
    const station = await stationService.update(id, input);
    if (!station) {
      throw new AppError(404, 'STATION_NOT_FOUND', 'Station not found');
    }
    sendSuccess(response, station);
  },
  async remove(request: Request, response: Response) {
    const id = parseInput(
      stationIdSchema,
      request.params.id,
      'Station id must be a valid UUID',
    );
    const station = await stationService.remove(id);
    if (!station) {
      throw new AppError(404, 'STATION_NOT_FOUND', 'Station not found');
    }
    sendSuccess(response);
  },
};
