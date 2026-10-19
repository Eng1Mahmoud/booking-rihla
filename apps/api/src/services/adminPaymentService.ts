import type { db as database } from '../prisma/db.ts';
import type { AdminPaymentListQuery } from '../schemas/adminPaymentSchema.ts';
import { serializeBookingPayment } from '../payments/paymentStatus.ts';
import { cairoDayBounds } from '../utils/cairoTime.ts';
function paymentRecords(db: typeof database) {
  return db.orm.public.PaymentAttempt.include('booking', (booking) =>
    booking
      .select(
        'id',
        'reference',
        'tripId',
        'status',
        'expiresAt',
        'totalPiastres',
      )
      .include('refund')
      .include('trip', (trip) => trip.select('status'))
      .include('user', (user) => user.select('id', 'name', 'email')),
  ).include('paymentSession', (operation) =>
    operation
      .select(
        'id',
        'status',
        'intentionId',
        'orderId',
        'integrationId',
        'ownerId',
        'createdAt',
        'updatedAt',
        'reconciliationComplete',
        'nextReconcileAt',
      )
      .include('settlement'),
  );
}
type PaymentRecord = NonNullable<
  Awaited<ReturnType<ReturnType<typeof paymentRecords>['first']>>
>;
function serialize(row: PaymentRecord) {
  const booking = row.booking,
    operation = row.paymentSession,
    settlement = operation?.settlement;
  if (!booking?.user) throw new Error('Payment booking relation missing');
  const status = serializeBookingPayment({ ...booking, paymentAttempt: row });
  return {
    id: row.id,
    bookingId: booking.id,
    reference: booking.reference,
    tripId: booking.tripId,
    customer: booking.user,
    bookingStatus: status.bookingStatus,
    paymentStatus: status.paymentStatus,
    refundStatus: status.refundStatus,
    requiresReview: settlement?.status === 'REVIEW',
    amountPiastres: Number(row.amountPiastres),
    bookingTotalPiastres: Number(booking.totalPiastres),
    currency: row.currency,
    expiresAt: new Date(row.expiresAt).toISOString(),
    bookingExpiresAt: status.expiresAt,
    createdAt: new Date(row.createdAt).toISOString(),
    serverTime: status.serverTime,
    paymentSession: operation
      ? {
          id: operation.id,
          status: operation.status,
          intentionId: operation.intentionId,
          orderId: operation.orderId,
          integrationId: operation.integrationId,
          ownerId: operation.ownerId,
          createdAt: new Date(operation.createdAt).toISOString(),
          updatedAt: new Date(operation.updatedAt).toISOString(),
          reconciliationComplete: operation.reconciliationComplete,
          nextReconcileAt: new Date(operation.nextReconcileAt).toISOString(),
        }
      : null,
    settlement: settlement
      ? {
          id: settlement.id,
          kind: settlement.kind,
          status: settlement.status,
          transactionId: settlement.transactionId,
          amountPiastres: Number(settlement.amountPiastres),
          createdAt: new Date(settlement.createdAt).toISOString(),
          updatedAt: new Date(settlement.updatedAt).toISOString(),
        }
      : null,
  };
}
export const adminPaymentService = {
  async list({
    limit,
    offset,
    bookingId,
    tripId,
    userId,
    reference,
    email,
    orderId,
    intentionId,
    transactionId,
    sessionStatus,
    settlementStatus,
    settlementKind,
    createdDate,
  }: AdminPaymentListQuery) {
    const { db } = await import('../prisma/db.ts');
    let query = paymentRecords(db).where(bookingId ? { bookingId } : {});
    if (tripId || userId || reference)
      query = query.where((p) =>
        p.booking.some({
          ...(tripId ? { tripId } : {}),
          ...(userId ? { userId } : {}),
          ...(reference ? { reference } : {}),
        }),
      );
    if (email)
      query = query.where((p) => p.booking.some((b) => b.user.some({ email })));
    if (orderId || intentionId || sessionStatus)
      query = query.where((p) =>
        p.paymentSession.some({
          ...(orderId ? { orderId } : {}),
          ...(intentionId ? { intentionId } : {}),
          ...(sessionStatus ? { status: sessionStatus } : {}),
        }),
      );
    if (transactionId || settlementStatus || settlementKind)
      query = query.where((p) =>
        p.paymentSession.some((a) =>
          a.settlement.some({
            ...(transactionId ? { transactionId } : {}),
            ...(settlementStatus ? { status: settlementStatus } : {}),
            ...(settlementKind ? { kind: settlementKind } : {}),
          }),
        ),
      );
    if (createdDate) {
      const { start, end } = cairoDayBounds(createdDate);
      query = query
        .where((p) => p.createdAt.gte(start))
        .where((p) => p.createdAt.lt(end));
    }
    const rows = await query
      .orderBy([(p) => p.createdAt.desc(), (p) => p.id.desc()])
      .limit(limit)
      .offset(offset)
      .all();
    return rows.map(serialize);
  },
  async findById(id: string) {
    const { db } = await import('../prisma/db.ts');
    const row = await paymentRecords(db).where({ id }).first();
    return row ? serialize(row) : null;
  },
};
export type AdminPaymentService = typeof adminPaymentService;
