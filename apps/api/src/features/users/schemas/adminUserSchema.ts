import { z } from 'zod';
import { registerSchema } from '../../auth/schemas/authSchema.ts';
import { paginationQuerySchema } from '../../../shared/paginationSchema.ts';

export const adminUserIdSchema = z.uuid();
export const adminUserDetailsQuerySchema = z.strictObject({});
export const adminUserListQuerySchema = paginationQuerySchema.extend({
  email: registerSchema.shape.email.optional(),
  phone: registerSchema.shape.phone.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export const updateUserStatusSchema = z.strictObject({ isActive: z.boolean() });
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
