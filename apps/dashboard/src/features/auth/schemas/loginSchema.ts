import { z } from 'zod';
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(12).max(128),
});
export type LoginValues = z.infer<typeof loginSchema>;
