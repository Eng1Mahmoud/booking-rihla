import { sendSuccess } from '../../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { adminPaymentStatisticsQuerySchema } from '../schemas/adminPaymentStatisticsSchema.ts';
import { adminPaymentStatisticsService } from '../services/adminPaymentStatisticsService.ts';
import { parseInput } from '../../../shared/requestValidation.ts';

export const adminPaymentStatisticsController = {
  async get(request: Request, response: Response) {
    const query = parseInput(
      adminPaymentStatisticsQuerySchema,
      request.query,
      'Use only an optional date (YYYY-MM-DD Cairo, years 2000-9998)',
    );
    sendSuccess(response, await adminPaymentStatisticsService.get(query));
  },
};
