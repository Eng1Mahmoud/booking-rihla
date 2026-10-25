import { z } from 'zod';
import {
  adminFleetListQuerySchema,
  adminFleetRowSchema,
} from './adminFleetSchema.ts';
import { adminCatalogPageSchema } from './adminCatalogSchema.ts';
export const adminBusListQuerySchema = adminFleetListQuerySchema.extend({
  busTypeId: z.uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export const adminBusRowSchema = z.strictObject({
  id: z.uuid(),
  plateNumber: z.string().min(1).max(32),
  seatCount: z.number().int().min(1).max(100),
  seatLayout: z.enum(['STANDARD_2_2']).nullable(),
  isActive: z.boolean(),
  busTypeId: z.uuid().nullable(),
  busType: adminFleetRowSchema.nullable(),
  amenities: z.array(adminFleetRowSchema).max(30),
});
export const adminBusPageSchema = adminCatalogPageSchema(adminBusRowSchema);
export type AdminBusListQuery = z.infer<typeof adminBusListQuerySchema>;
