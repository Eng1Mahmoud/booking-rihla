import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';

// Require an explicit offset; normalize accepted instants to millisecond UTC strings.
const timestamp = z.iso
  .datetime({ offset: true })
  .refine(
    (value) => !/\.\d{4,}/.test(value),
    'Use at most millisecond precision',
  )
  .transform((value) => new Date(value).toISOString());
const price = z.number().int().min(0).max(2147483647);
const status = z.enum(['SCHEDULED', 'CANCELLED']);
const orderedTimes = (input: { departureAt?: string; arrivalAt?: string }) =>
  !input.departureAt ||
  !input.arrivalAt ||
  Date.parse(input.arrivalAt) > Date.parse(input.departureAt);
export const createTripSchema = z
  .strictObject({
    routeId: z.uuid(),
    busId: z.uuid(),
    departureAt: timestamp,
    arrivalAt: timestamp,
    pricePiastres: price,
    status: status.default('SCHEDULED'),
  })
  .refine(orderedTimes, 'Arrival must be after departure');
export const updateTripSchema = z
  .strictObject({
    routeId: z.uuid().optional(),
    busId: z.uuid().optional(),
    departureAt: timestamp.optional(),
    arrivalAt: timestamp.optional(),
    pricePiastres: price.optional(),
    status: status.optional(),
  })
  .refine(
    (input) => Object.keys(input).length > 0,
    'Provide at least one trip field',
  )
  .refine(orderedTimes, 'Arrival must be after departure');
export const tripIdSchema = z.uuid();
export const tripListQuerySchema = paginationQuerySchema.extend({
  routeId: z.uuid().optional(),
  busId: z.uuid().optional(),
  status: status.optional(),
});
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type TripListQuery = z.infer<typeof tripListQuerySchema>;

export const tripDetailsQuerySchema = z.strictObject({});
