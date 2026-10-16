import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';

export const tripSearchQuerySchema = paginationQuerySchema
  .extend({
    originCityId: z.uuid().optional(),
    originStationId: z.uuid().optional(),
    destinationCityId: z.uuid().optional(),
    destinationStationId: z.uuid().optional(),
    travelDate: z.iso
      .date()
      .refine(
        (value) => value >= '2000-01-01' && value <= '9998-12-31',
        'Use a date from 2000 through 9998',
      ),
  })
  .refine(
    (input) => Boolean(input.originCityId) !== Boolean(input.originStationId),
    'Choose one origin city or station',
  )
  .refine(
    (input) =>
      Boolean(input.destinationCityId) !== Boolean(input.destinationStationId),
    'Choose one destination city or station',
  )
  .refine(
    (input) =>
      !input.originStationId ||
      input.originStationId !== input.destinationStationId,
    'Stations must differ',
  );
export type TripSearchQuery = z.infer<typeof tripSearchQuerySchema>;
