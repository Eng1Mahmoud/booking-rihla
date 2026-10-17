import { z } from 'zod';
export const paymentAttemptKeySchema = z
  .uuid()
  .transform((value) => value.toLowerCase());
export const paymentAttemptBodySchema = z.strictObject({});
