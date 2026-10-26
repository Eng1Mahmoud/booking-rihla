import { z } from 'zod';
import { bookingFiltersSchema } from '@/features/bookings/schemas/bookingSchema';
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const paymentSchema = z.object({
  id: z.uuid(),
  bookingId: z.uuid(),
  reference: z.string(),
  tripId: z.uuid(),
  customer: z.object({ id: z.uuid(), name: z.string(), email: z.string() }),
  bookingStatus: z.string(),
  paymentStatus: z.enum([
    'NOT_STARTED',
    'PREPARED',
    'INITIALIZING',
    'AWAITING_PAYMENT',
    'UNKNOWN',
    'PROCESSING',
    'PAID',
    'REFUNDED',
    'REFUND_REQUIRED',
    'FAILED',
    'EXPIRED',
    'REVIEW',
  ]),
  refundStatus: z.string().nullable(),
  requiresReview: z.boolean(),
  amountPiastres: count,
  bookingTotalPiastres: count,
  currency: z.literal('EGP'),
  createdAt: z.string(),
  paymentSession: z
    .object({
      id: z.uuid(),
      status: z.string(),
      intentionId: z.string().nullable(),
      orderId: z.string().nullable(),
      integrationId: z.string(),
      ownerId: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      reconciliationComplete: z.boolean(),
    })
    .nullable(),
  settlement: z
    .object({
      id: z.uuid(),
      kind: z.literal('SALE'),
      status: z.string(),
      transactionId: z.string().nullable(),
      amountPiastres: count,
      createdAt: z.string(),
      updatedAt: z.string(),
    })
    .nullable(),
});
const providerId = z.union([
  z.literal(''),
  z
    .string()
    .regex(/^[1-9][0-9]{0,15}$/)
    .refine((value) => Number.isSafeInteger(Number(value))),
]);
export const paymentFiltersSchema = bookingFiltersSchema
  .omit({ travelDate: true })
  .extend({
    bookingId: z.union([z.literal(''), z.uuid()]),
    createdDate: z.union([z.literal(''), z.iso.date()]),
    orderId: providerId,
    transactionId: providerId,
    intentionId: z.union([
      z.literal(''),
      z.string().regex(/^pi_test_[A-Za-z0-9_-]{1,200}$/),
    ]),
    sessionStatus: z.enum([
      '',
      'REQUESTING',
      'READY',
      'UNKNOWN',
      'FAILED',
      'EXPIRED',
    ]),
    settlementStatus: z.enum([
      '',
      'REQUESTED',
      'UNKNOWN',
      'SUCCEEDED',
      'REVIEW',
    ]),
  });
export const paymentListSchema = paymentFiltersSchema.extend({
  limit: z.number().int().min(1).max(99),
  offset: z.number().int().min(0).max(100000),
});
export type Payment = z.infer<typeof paymentSchema>;
export type PaymentFilters = z.infer<typeof paymentFiltersSchema>;

export const emptyPaymentFilters: PaymentFilters = {
  reference: '',
  email: '',
  tripId: '',
  userId: '',
  bookingId: '',
  createdDate: '',
  orderId: '',
  transactionId: '',
  intentionId: '',
  sessionStatus: '',
  settlementStatus: '',
};
