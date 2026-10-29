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
      .refine((value) => /^[0-9]+$/.test(value), {
        params: { messageKey: 'wholeNumber' },
      })
      .transform(Number)
      .pipe(routeInputSchema.shape.estimatedDurationMinutes),
  })
  .refine((value) => value.originStationId !== value.destinationStationId, {
    path: ['destinationStationId'],
    params: { messageKey: 'differentStations' },
  });
export type Route = z.infer<typeof routeSchema>;
export type RouteInput = z.infer<typeof routeInputSchema>;
export type RouteListQuery = {
  limit: number;
  offset: number;
  originStationId: string;
  destinationStationId: string;
  isActive: '' | 'true' | 'false';
};
