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
import { parseInput, requireJson } from '../../shared/requestValidation.ts';

export const cityController = {
  async list(request: Request, response: Response) {
    const query = parseInput(
      cityListQuerySchema,
      request.query,
      'Use limit 1-100 and offset 0-100000; no other query fields are supported',
    );
    const cities = await cityService.list(query);
    sendSuccess(response, { items: cities, pagination: query });
  },
  async getById(request: Request, response: Response) {
    const id = parseInput(
      cityIdSchema,
      request.params.id,
      'City id must be a valid UUID',
    );
    const city = await cityService.findById(id);
    if (!city) {
      throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
    }
    sendSuccess(response, city);
  },
  async create(request: Request, response: Response) {
    requireJson(request);
    const input = parseInput(
      createCitySchema,
      request.body,
      'Provide only nameAr and nameEn, each containing 1-100 characters after trimming',
    );
    const city = await cityService.create(input);
    sendSuccess(
      response.location('/api/v1/cities/' + city.id).status(201),
      city,
    );
  },
  async update(request: Request, response: Response) {
    const id = parseInput(
      cityIdSchema,
      request.params.id,
      'City id must be a valid UUID',
    );
    requireJson(request);
    const input = parseInput(
      updateCitySchema,
      request.body,
      'Provide nameAr or nameEn, each containing 1-100 characters after trimming; no other fields are allowed',
    );
    const city = await cityService.update(id, input);
    if (!city) {
      throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
    }
    sendSuccess(response, city);
  },
  async remove(request: Request, response: Response) {
    const id = parseInput(
      cityIdSchema,
      request.params.id,
      'City id must be a valid UUID',
    );
    const city = await cityService.remove(id);
    if (!city) {
      throw new AppError(404, 'CITY_NOT_FOUND', 'City not found');
    }
    sendSuccess(response);
  },
};
