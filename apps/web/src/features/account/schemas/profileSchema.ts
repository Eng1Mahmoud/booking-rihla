import { z } from 'zod';
import { registerSchema } from '@/features/auth/schemas/authSchema';

export const profileSchema = z.strictObject({
  name: registerSchema.shape.name,
  phone: registerSchema.shape.phone,
});
export type ProfileInput = z.infer<typeof profileSchema>;
