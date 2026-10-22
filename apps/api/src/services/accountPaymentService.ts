import type { db as database } from '../prisma/db.ts';
import type { z } from 'zod';
import type { paginationQuerySchema } from '../schemas/paginationSchema.ts';
import { serializeBookingPayment } from '../payments/paymentStatus.ts';

function paymentRecords(db: typeof database, userId: string) {
  return db.orm.public.PaymentAttempt.select(
    'id',
    'bookingId',
    'amountPiastres',
    'currency',
    'createdAt',
    'expiresAt',
  )
    .where((attempt) => attempt.booking.some({ userId }))
    .include('booking', (booking) =>
      booking
        .select('id', 'reference', 'status', 'expiresAt', 'totalPiastres')
        .include('trip', (trip) => trip.select('status'))
        .include('refund', (refund) =>
          refund.select('status', 'amountPiastres', 'createdAt', 'updatedAt'),
        ),
    )
    .include('paymentSession', (session) =>
      session
        .select('status', 'reconciliationComplete')
        .include('settlement', (settlement) =>
          settlement.select('status', 'kind', 'amountPiastres'),
        ),
    );
}

type PaymentRecord = Awaited<
  ReturnType<ReturnType<typeof paymentRecords>['all']>
>[number];

function serialize(row: PaymentRecord) {
  if (!row.booking) throw new Error('Payment booking relation missing');
  const status = serializeBookingPayment({
    ...row.booking,
    paymentAttempt: row,
  });
  const refund = row.booking.refund;
  // Explicit customer fields only: no checkout links, provider identifiers or event payloads.
  return {
    id: row.id,
    bookingId: row.bookingId,
    reference: row.booking.reference,
    createdAt: new Date(row.createdAt).toISOString(),
    amountPiastres: Number(row.amountPiastres),
    currency: row.currency,
    bookingStatus: status.bookingStatus,
    paymentStatus: status.paymentStatus,
    refund: refund
      ? {
          status: refund.status,
          amountPiastres: Number(refund.amountPiastres),
          createdAt: new Date(refund.createdAt).toISOString(),
          updatedAt: new Date(refund.updatedAt).toISOString(),
        }
      : null,
  };
}

export const accountPaymentService = {
  async list(
    userId: string,
    { limit, offset }: z.infer<typeof paginationQuerySchema>,
  ) {
    const { db } = await import('../prisma/db.ts');
    const rows = await paymentRecords(db, userId)
      .orderBy([
        (attempt) => attempt.createdAt.desc(),
        (attempt) => attempt.id.desc(),
      ])
      .limit(limit + 1)
      .offset(offset)
      .all();
    // Read one extra record to avoid a final empty page or an independent count query.
    return {
      items: rows.slice(0, limit).map(serialize),
      pagination: { limit, offset, hasMore: rows.length > limit },
    };
  },
};
export type AccountPaymentService = typeof accountPaymentService;
