import { z } from 'zod';

function pageNumber(min: number, max: number) {
  return z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
}

export const paginationQuerySchema = z.strictObject({
  limit: pageNumber(1, 100).default(20),
  offset: pageNumber(0, 100_000).default(0),
});
