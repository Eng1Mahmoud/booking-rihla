import { sendSuccess } from '../../utils/apiResponse.ts';
import { cairoTimeZone } from '../../utils/cairoTime.ts';
import type { Request, Response } from 'express';
import { tripSearchQuerySchema } from './tripSearchSchema.ts';
import { tripSearchService } from './tripSearchService.ts';
import { parseInput } from '../../shared/requestValidation.ts';

export const tripSearchController = async (
  request: Request,
  response: Response,
) => {
  const query = parseInput(
    tripSearchQuerySchema,
    request.query,
    'Provide travelDate (YYYY-MM-DD), exactly one originCityId/originStationId and one destinationCityId/destinationStationId (UUIDs), limit 1-100 and offset 0-100000; stations must differ and unknown fields are rejected',
  );
  const data = await tripSearchService.search(query);
  sendSuccess(response, {
    items: data,
    pagination: { limit: query.limit, offset: query.offset },
    search: { travelDate: query.travelDate, timeZone: cairoTimeZone },
  });
};
