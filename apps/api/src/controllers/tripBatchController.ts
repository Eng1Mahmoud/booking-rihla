import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import {
  tripBatchSchema,
  tripBatchQuerySchema,
} from '../schemas/tripBatchSchema.ts';
import type { TripBatchService } from '../services/tripBatchService.ts';

export function createTripBatchController(service: TripBatchService) {
  function input(request: Request) {
    if (!request.is('application/json'))
      throw new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json',
      );
    const parsed = tripBatchSchema.safeParse(request.body);
    if (
      !parsed.success ||
      !tripBatchQuerySchema.safeParse(request.query).success
    )
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Provide routeId/busId UUIDs, startDate/endDate (1-90 days), distinct weekdays (1 Monday to 7 Sunday), departureTime (HH:mm Cairo), durationMinutes (1-10080) and pricePiastres (0-2147483647); no extra fields or query parameters',
      );
    return parsed.data;
  }
  return {
    async preview(request: Request, response: Response) {
      response.json({ data: await service.preview(input(request)) });
    },
    async create(request: Request, response: Response) {
      response.status(201).json({ data: await service.create(input(request)) });
    },
  };
}
