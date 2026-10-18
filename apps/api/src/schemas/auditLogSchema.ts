import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';
export const auditLogQuerySchema = paginationQuerySchema
  .extend({
    actorId: z.uuid().optional(),
    entity: z
      .enum([
        'City',
        'Station',
        'Route',
        'Bus',
        'BusType',
        'Amenity',
        'Trip',
        'User',
        'Refund',
      ])
      .optional(),
    entityId: z.uuid().optional(),
    action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'BOOTSTRAP']).optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
  })
  .refine((q) => !q.from || !q.to || Date.parse(q.from) <= Date.parse(q.to), {
    message: 'from must not be after to',
  });
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
