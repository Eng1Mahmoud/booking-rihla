import { z } from 'zod';
import { registerSchema, userRoleSchema } from './authSchema.ts';
import { paginationQuerySchema } from './paginationSchema.ts';
export const administratorIdSchema = z.uuid();
export const administratorDetailsQuerySchema = z.strictObject({});
export const administratorListQuerySchema = paginationQuerySchema.extend({
  email: registerSchema.shape.email.optional(),
  role: z.enum(['STAFF', 'ADMIN', 'SUPER_ADMIN']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export const updateAdministratorRoleSchema = z.strictObject({
  role: userRoleSchema,
});
export const updateAdministratorStatusSchema = z.strictObject({
  isActive: z.boolean(),
});
export type AdministratorListQuery = z.infer<
  typeof administratorListQuerySchema
>;
export type UpdateAdministratorRoleInput = z.infer<
  typeof updateAdministratorRoleSchema
>;
export type UpdateAdministratorStatusInput = z.infer<
  typeof updateAdministratorStatusSchema
>;
