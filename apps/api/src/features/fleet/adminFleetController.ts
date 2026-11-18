import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse.ts';
import { adminFleetListQuerySchema } from './adminFleetSchema.ts';
import { adminFleetService } from './adminFleetService.ts';
import { parseInput } from '../../shared/requestValidation.ts';

export const adminFleetController = {
  async busTypes(request: Request, response: Response) {
    const query = parseInput(
      adminFleetListQuerySchema,
      request.query,
      'Invalid bus type list filters',
    );
    sendSuccess(
      response.set('Cache-Control', 'private, no-store'),
      await adminFleetService.busTypes(query),
    );
  },
  async amenities(request: Request, response: Response) {
    const query = parseInput(
      adminFleetListQuerySchema,
      request.query,
      'Invalid amenity list filters',
    );
    sendSuccess(
      response.set('Cache-Control', 'private, no-store'),
      await adminFleetService.amenities(query),
    );
  },
};
