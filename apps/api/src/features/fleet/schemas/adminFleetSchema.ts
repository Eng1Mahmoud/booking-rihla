import { z } from 'zod';
import { paginationQuerySchema } from '../../../shared/paginationSchema.ts';
import { createFleetMetadataSchema } from './fleetMetadataSchema.ts';
import { adminCatalogPageSchema } from '../../catalog/schemas/adminCatalogSchema.ts';

export const adminFleetListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).default(''),
  locale: z.enum(['ar', 'en']).default('en'),
});
export const adminFleetRowSchema = createFleetMetadataSchema.extend({
  id: z.uuid(),
});
export const adminFleetPageSchema = adminCatalogPageSchema(adminFleetRowSchema);
export type AdminFleetListQuery = z.infer<typeof adminFleetListQuerySchema>;
