import { z } from 'zod';
export const listQuerySchema = z.strictObject({
  search: z.string().trim().max(200),
  limit: z.number().int().min(1).max(100),
  offset: z.number().int().min(0).max(100000),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
export type ListPage<T> = { items: T[]; total: number };
