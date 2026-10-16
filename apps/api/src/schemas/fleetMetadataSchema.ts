import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9_]{0,31}$/);
const name = z.string().trim().min(1).max(100);
export const createFleetMetadataSchema = z.strictObject({
  code,
  nameAr: name,
  nameEn: name,
});
export const updateFleetMetadataSchema = createFleetMetadataSchema
  .partial()
  .refine(
    (input) => Object.keys(input).length > 0,
    'Provide at least one metadata field',
  );
export const fleetMetadataIdSchema = z.uuid();
export const fleetMetadataListSchema = paginationQuerySchema;
export const fleetMetadataDetailsSchema = z.strictObject({});
export type FleetMetadataInput = z.infer<typeof createFleetMetadataSchema>;
export type FleetMetadataUpdate = z.infer<typeof updateFleetMetadataSchema>;
export type FleetMetadataQuery = z.infer<typeof fleetMetadataListSchema>;
export type FleetMetadata = FleetMetadataInput & { id: string };
