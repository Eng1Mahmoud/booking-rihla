import { z } from 'zod';
import type { BookingFilters } from '@/features/bookings';
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
export type Payment = z.infer<typeof paymentSchema>;
export type PaymentFilterValues = Omit<BookingFilters, 'travelDate'> & {
  bookingId: string;
  createdDate: string;
  orderId: string;
  transactionId: string;
  intentionId: string;
  sessionStatus: '' | 'REQUESTING' | 'READY' | 'UNKNOWN' | 'FAILED' | 'EXPIRED';
  settlementStatus: '' | 'REQUESTED' | 'UNKNOWN' | 'SUCCEEDED' | 'REVIEW';
};

export const emptyPaymentFilters: PaymentFilterValues = {
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
