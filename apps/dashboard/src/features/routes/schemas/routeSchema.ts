import { z } from 'zod';
export const routeInputSchema = z.object({
  originStationId: z.uuid(),
  destinationStationId: z.uuid(),
  estimatedDurationMinutes: z.number().int().min(1).max(10080),
  isActive: z.boolean(),
});
export const routeSchema = routeInputSchema.extend({ id: z.uuid() });
export const routeFormSchema = routeInputSchema
  .extend({
    estimatedDurationMinutes: z
      .string()
      .regex(/^[0-9]+$/)
      .transform(Number)
      .pipe(routeInputSchema.shape.estimatedDurationMinutes),
  })
  .refine((value) => value.originStationId !== value.destinationStationId, {
    path: ['destinationStationId'],
    params: { messageKey: 'differentStations' },
  });
export const routeListSchema = z.object({
  limit: z.number().int().min(1).max(99),
  offset: z.number().int().min(0).max(100000),
  originStationId: z.union([z.literal(''), z.uuid()]),
  destinationStationId: z.union([z.literal(''), z.uuid()]),
  isActive: z.enum(['', 'true', 'false']),
});
export type Route = z.infer<typeof routeSchema>;
export type RouteInput = z.infer<typeof routeInputSchema>;
export type RouteListQuery = z.infer<typeof routeListSchema>;
