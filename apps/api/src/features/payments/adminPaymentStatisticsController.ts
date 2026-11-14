import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import { adminPaymentStatisticsQuerySchema } from './adminPaymentStatisticsSchema.ts';
import { adminPaymentStatisticsService } from './adminPaymentStatisticsService.ts';

export const adminPaymentStatisticsController = {
  async get(request: Request, response: Response) {
    const query = adminPaymentStatisticsQuerySchema.safeParse(request.query);
    if (!query.success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Use only an optional date (YYYY-MM-DD Cairo, years 2000-9998)',
      );
    sendSuccess(response, await adminPaymentStatisticsService.get(query.data));
  },
};
