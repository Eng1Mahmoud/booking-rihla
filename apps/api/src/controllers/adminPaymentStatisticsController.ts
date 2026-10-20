import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import { adminPaymentStatisticsQuerySchema } from '../schemas/adminPaymentStatisticsSchema.ts';
import type { AdminPaymentStatisticsService } from '../services/adminPaymentStatisticsService.ts';

export function createAdminPaymentStatisticsController(
  service: AdminPaymentStatisticsService,
) {
  return {
    async get(request: Request, response: Response) {
      const query = adminPaymentStatisticsQuerySchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use only an optional date (YYYY-MM-DD Cairo, years 2000-9998)',
        );
      sendSuccess(response, await service.get(query.data));
    },
  };
}
