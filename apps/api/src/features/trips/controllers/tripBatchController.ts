import { sendSuccess } from '../../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../../errors/AppError.ts';
import {
  tripBatchSchema,
  tripBatchQuerySchema,
} from '../schemas/tripBatchSchema.ts';
import { tripBatchService } from '../services/tripBatchService.ts';
import { requireJson } from '../../../shared/requestValidation.ts';

function input(request: Request) {
  requireJson(request);
  const parsed = tripBatchSchema.safeParse(request.body);
  if (!parsed.success || !tripBatchQuerySchema.safeParse(request.query).success)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Provide routeId/busId UUIDs, startDate/endDate (1-90 days), distinct weekdays (1 Monday to 7 Sunday), departureTime (HH:mm Cairo), durationMinutes (1-10080) and pricePiastres (0-2147483647); no extra fields or query parameters',
    );
  return parsed.data;
}
export const tripBatchController = {
  async preview(request: Request, response: Response) {
    sendSuccess(response, await tripBatchService.preview(input(request)));
  },
  async create(request: Request, response: Response) {
    sendSuccess(
      response.status(201),
      await tripBatchService.create(input(request)),
    );
  },
};
