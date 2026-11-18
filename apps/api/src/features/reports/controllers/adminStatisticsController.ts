import { sendSuccess } from '../../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { adminStatisticsQuerySchema } from '../schemas/adminStatisticsSchema.ts';
import { adminStatisticsService } from '../services/adminStatisticsService.ts';
import { parseInput } from '../../../shared/requestValidation.ts';

export const adminStatisticsController = {
  async get(request: Request, response: Response) {
    const query = parseInput(
      adminStatisticsQuerySchema,
      request.query,
      'Use only an optional travelDate (YYYY-MM-DD Cairo, years 2000-9998)',
    );
    sendSuccess(response, await adminStatisticsService.get(query));
  },
};
