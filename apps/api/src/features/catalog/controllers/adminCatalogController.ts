import type { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/apiResponse.ts';
import {
  adminCityListQuerySchema,
  adminStationListQuerySchema,
} from '../schemas/adminCatalogSchema.ts';
import { adminCatalogService } from '../services/adminCatalogService.ts';
import { parseInput } from '../../../shared/requestValidation.ts';

export const adminCatalogController = {
  async cities(request: Request, response: Response) {
    const query = parseInput(
      adminCityListQuerySchema,
      request.query,
      'Invalid city list filters',
    );
    sendSuccess(
      response.set('Cache-Control', 'private, no-store'),
      await adminCatalogService.cities(query),
    );
  },
  async stations(request: Request, response: Response) {
    const query = parseInput(
      adminStationListQuerySchema,
      request.query,
      'Invalid station list filters',
    );
    sendSuccess(
      response.set('Cache-Control', 'private, no-store'),
      await adminCatalogService.stations(query),
    );
  },
};
