import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import { sendSuccess } from '../utils/apiResponse.ts';
import { adminBusListQuerySchema } from '../schemas/adminBusSchema.ts';
import type { AdminBusService } from '../services/adminBusService.ts';
export function createAdminBusController(service: AdminBusService) {
  return {
    async list(request: Request, response: Response) {
      const query = adminBusListQuerySchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid bus list filters');
      sendSuccess(
        response.set('Cache-Control', 'private, no-store'),
        await service.list(query.data),
      );
    },
  };
}
