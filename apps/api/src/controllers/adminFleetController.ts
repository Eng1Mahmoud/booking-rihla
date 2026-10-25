import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import { sendSuccess } from '../utils/apiResponse.ts';
import { adminFleetListQuerySchema } from '../schemas/adminFleetSchema.ts';
import type { AdminFleetService } from '../services/adminFleetService.ts';

export function createAdminFleetController(service: AdminFleetService) {
  return {
    async busTypes(request: Request, response: Response) {
      const query = adminFleetListQuerySchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid bus type list filters',
        );
      sendSuccess(
        response.set('Cache-Control', 'private, no-store'),
        await service.busTypes(query.data),
      );
    },
    async amenities(request: Request, response: Response) {
      const query = adminFleetListQuerySchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid amenity list filters',
        );
      sendSuccess(
        response.set('Cache-Control', 'private, no-store'),
        await service.amenities(query.data),
      );
    },
  };
}
