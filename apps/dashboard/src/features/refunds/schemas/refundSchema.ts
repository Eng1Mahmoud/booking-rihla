import { z } from 'zod';
export const refundSchema = z.object({
  id: z.uuid(),
  bookingId: z.uuid(),
  status: z.enum(['PENDING', 'REQUESTED', 'UNKNOWN', 'SUCCEEDED', 'REVIEW']),
  amountPiastres: z.string().regex(/^[0-9]+$/),
  currency: z.literal('EGP'),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Refund = z.infer<typeof refundSchema>;
