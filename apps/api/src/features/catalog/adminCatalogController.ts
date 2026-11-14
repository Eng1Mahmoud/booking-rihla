import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import { sendSuccess } from '../../utils/apiResponse.ts';
import {
  adminCityListQuerySchema,
  adminStationListQuerySchema,
} from './adminCatalogSchema.ts';
import { adminCatalogService } from './adminCatalogService.ts';

export const adminCatalogController = {
  async cities(request: Request, response: Response) {
    const query = adminCityListQuerySchema.safeParse(request.query);
    if (!query.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid city list filters');
    sendSuccess(
      response.set('Cache-Control', 'private, no-store'),
      await adminCatalogService.cities(query.data),
    );
  },
  async stations(request: Request, response: Response) {
    const query = adminStationListQuerySchema.safeParse(request.query);
    if (!query.success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Invalid station list filters',
      );
    sendSuccess(
      response.set('Cache-Control', 'private, no-store'),
      await adminCatalogService.stations(query.data),
    );
  },
};
