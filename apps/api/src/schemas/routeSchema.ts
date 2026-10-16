import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';

const duration = z.number().int().min(1).max(10080);
const distinctStations = (input: {
  originStationId?: string;
  destinationStationId?: string;
}) =>
  !input.originStationId ||
  !input.destinationStationId ||
  input.originStationId !== input.destinationStationId;
export const createRouteSchema = z
  .strictObject({
    originStationId: z.uuid(),
    destinationStationId: z.uuid(),
    estimatedDurationMinutes: duration,
    isActive: z.boolean().default(true),
  })
  .refine(distinctStations, 'Origin and destination stations must differ');
export const updateRouteSchema = z
  .strictObject({
    originStationId: z.uuid().optional(),
    destinationStationId: z.uuid().optional(),
    estimatedDurationMinutes: duration.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (input) => Object.keys(input).length > 0,
    'Provide at least one route field',
  )
  .refine(distinctStations, 'Origin and destination stations must differ');
export const routeIdSchema = z.uuid();
export const routeListQuerySchema = paginationQuerySchema.extend({
  originStationId: z.uuid().optional(),
  destinationStationId: z.uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type RouteListQuery = z.infer<typeof routeListQuerySchema>;
