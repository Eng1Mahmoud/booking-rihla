import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import type { CityService } from '../services/cityService.ts';
import {
  cityIdSchema,
  cityListQuerySchema,
  createCitySchema,
  updateCitySchema,
} from '../schemas/citySchema.ts';

export function createCityController(service: CityService) {
  return {
    async list(request: Request, response: Response) {
      const query = cityListQuerySchema.safeParse(request.query);
      if (!query.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use limit 1-100 and offset 0-100000; no other query fields are supported',
        );
      }
      const cities = await service.list(query.data);
      response.json({ data: cities, pagination: query.data });
    },
    async getById(request: Request, response: Response) {
      const id = cityIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'City id must be a valid UUID',
        );
      }
      const city = await service.findById(id.data);
      if (!city) {
        throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
      }
      response.json({ data: city });
    },
    async create(request: Request, response: Response) {
      if (!request.is('application/json')) {
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      }
      const input = createCitySchema.safeParse(request.body);
      if (!input.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only nameAr and nameEn, each containing 1-100 characters after trimming',
        );
      }
      const city = await service.create(input.data, response.locals.auth);
      response
        .location('/api/v1/cities/' + city.id)
        .status(201)
        .json({ data: city });
    },
    async update(request: Request, response: Response) {
      const id = cityIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'City id must be a valid UUID',
        );
      }
      if (!request.is('application/json')) {
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      }
      const input = updateCitySchema.safeParse(request.body);
      if (!input.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide nameAr or nameEn, each containing 1-100 characters after trimming; no other fields are allowed',
        );
      }
      const city = await service.update(
        id.data,
        input.data,
        response.locals.auth,
      );
      if (!city) {
        throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
      }
      response.json({ data: city });
    },
    async remove(request: Request, response: Response) {
      const id = cityIdSchema.safeParse(request.params.id);
      if (!id.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'City id must be a valid UUID',
        );
      }
      const city = await service.remove(id.data, response.locals.auth);
      if (!city) {
        throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
      }
      response.status(204).end();
    },
  };
}
