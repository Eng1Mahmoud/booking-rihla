import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import { cityService } from './cityService.ts';
import {
  cityIdSchema,
  cityListQuerySchema,
  createCitySchema,
  updateCitySchema,
} from './citySchema.ts';

export const cityController = {
  async list(request: Request, response: Response) {
    const query = cityListQuerySchema.safeParse(request.query);
    if (!query.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Use limit 1-100 and offset 0-100000; no other query fields are supported',
      );
    }
    const cities = await cityService.list(query.data);
    sendSuccess(response, { items: cities, pagination: query.data });
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
    const city = await cityService.findById(id.data);
    if (!city) {
      throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
    }
    sendSuccess(response, city);
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
    const city = await cityService.create(input.data);
    sendSuccess(
      response.location('/api/v1/cities/' + city.id).status(201),
      city,
    );
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
    const city = await cityService.update(id.data, input.data);
    if (!city) {
      throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
    }
    sendSuccess(response, city);
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
    const city = await cityService.remove(id.data);
    if (!city) {
      throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
    }
    sendSuccess(response);
  },
};
