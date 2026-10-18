import { z } from 'zod';
export const cancellationSchema = z
  .object({ reason: z.string().trim().min(5).max(500) })
  .strict();
export const refundIdSchema = z.uuid();
