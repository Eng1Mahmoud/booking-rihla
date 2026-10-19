import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';
import { adminBookingListQuerySchema } from './adminBookingSchema.ts';
const providerId = z
  .string()
  .regex(/^[1-9][0-9]{0,15}$/)
  .refine((value) => Number.isSafeInteger(Number(value)));
export const adminPaymentListQuerySchema = paginationQuerySchema.extend({
  bookingId: z.uuid().optional(),
  tripId: adminBookingListQuerySchema.shape.tripId,
  userId: adminBookingListQuerySchema.shape.userId,
  reference: adminBookingListQuerySchema.shape.reference,
  email: adminBookingListQuerySchema.shape.email,
  orderId: providerId.optional(),
  transactionId: providerId.optional(),
  intentionId: z
    .string()
    .regex(/^pi_test_[A-Za-z0-9_-]{1,200}$/)
    .optional(),
  sessionStatus: z
    .enum(['REQUESTING', 'READY', 'UNKNOWN', 'FAILED', 'EXPIRED'])
    .optional(),
  settlementStatus: z
    .enum(['REQUESTED', 'UNKNOWN', 'SUCCEEDED', 'REVIEW'])
    .optional(),
  settlementKind: z.enum(['SALE']).optional(),
  // PaymentAttempt creation day in Cairo, not travel day or collection day.
  createdDate: adminBookingListQuerySchema.shape.travelDate,
});
export const adminPaymentIdSchema = z.uuid();
export type AdminPaymentListQuery = z.infer<typeof adminPaymentListQuerySchema>;
