import { z } from 'zod';
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  password: z.string().min(12).max(128),
});
export type AuthFormValues = z.input<typeof registerSchema> & { code: string };
