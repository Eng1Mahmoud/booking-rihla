import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import { tripSearchQuerySchema } from '../schemas/tripSearchSchema.ts';
import type { TripSearchService } from '../services/tripSearchService.ts';
import { cairoTimeZone } from '../utils/cairoTime.ts';

export function createTripSearchController(service: TripSearchService) {
  return async (request: Request, response: Response) => {
    const query = tripSearchQuerySchema.safeParse(request.query);
    if (!query.success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Provide travelDate (YYYY-MM-DD), exactly one originCityId/originStationId and one destinationCityId/destinationStationId (UUIDs), limit 1-100 and offset 0-100000; stations must differ and unknown fields are rejected',
      );
    const data = await service.search(query.data);
    response.json({
      data,
      pagination: { limit: query.data.limit, offset: query.data.offset },
      search: { travelDate: query.data.travelDate, timeZone: cairoTimeZone },
    });
  };
}
