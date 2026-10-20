import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import { adminStatisticsQuerySchema } from '../schemas/adminStatisticsSchema.ts';
import type { AdminStatisticsService } from '../services/adminStatisticsService.ts';
export function createAdminStatisticsController(
  service: AdminStatisticsService,
) {
  return {
    async get(request: Request, response: Response) {
      const query = adminStatisticsQuerySchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use only an optional travelDate (YYYY-MM-DD Cairo, years 2000-9998)',
        );
      sendSuccess(response, await service.get(query.data));
    },
  };
}
