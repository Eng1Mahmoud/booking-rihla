import { AppError } from '../errors/AppError.ts';
import type { AuthContext } from './sessionService.ts';
import { recordAudit } from './auditWriter.ts';
import { requireFinancialActor } from './financialActor.ts';
import { serializeBookingPayment } from '../payments/paymentStatus.ts';
export const tripCancellationService = {
  async cancel(auth: AuthContext, tripId: string, reason: string) {
    const { db } = await import('../prisma/db.ts');
    return db.transaction(async (tx) => {
      await requireFinancialActor(tx, db, auth);
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."Trip" WHERE "id" = ${tripId} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      const trip = await tx.orm.public.Trip.where({ id: tripId }).first();
      if (!trip) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found');
      if (trip.status === 'CANCELLED')
        return {
          id: trip.id,
          status: trip.status,
          cancelledAt: trip.cancelledAt,
        };
      if (Date.parse(trip.departureAt) <= Date.now())
        throw new AppError(
          409,
          'TRIP_DEPARTED',
          'Only future trips may be cancelled',
        );
      const bookings = await tx.orm.public.Booking.where({ tripId })
        .include('paymentAttempt', (a) =>
          a.include('paymentSession', (o) => o.include('settlement')),
        )
        .all();
      // Active checkout holds must finish before cancellation; expired payments refund if they arrive late.
      for (const booking of bookings) {
        const authz = booking.paymentAttempt?.paymentSession;
        if (
          booking.status === 'PAYMENT_PROCESSING' ||
          (authz &&
            !authz.reconciliationComplete &&
            booking.expiresAt &&
            Date.parse(booking.expiresAt) > Date.now()) ||
          authz?.settlement?.status === 'REVIEW'
        )
          throw new AppError(
            409,
            'PAYMENTS_UNRESOLVED',
            'Resolve pending payments and review cases before cancelling this trip',
          );
        if (
          booking.status === 'CONFIRMED' &&
          serializeBookingPayment(booking).paymentStatus !== 'PAID'
        )
          throw new AppError(
            409,
            'PAYMENTS_UNRESOLVED',
            'A confirmed booking has no verified full payment',
          );
      }
      const now = new Date().toISOString();
      const saved = await tx.orm.public.Trip.where({ id: tripId }).update({
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: reason,
      });
      for (const booking of bookings) {
        await tx.orm.public.BookingSeat.where({
          bookingId: booking.id,
          releasedAt: null,
        }).updateAll({ releasedAt: now });
        if (
          booking.status === 'PENDING_PAYMENT' ||
          booking.status === 'RESERVED'
        )
          await tx.orm.public.Booking.where({ id: booking.id }).update({
            status: 'EXPIRED',
            expiresAt: booking.expiresAt ?? now,
          });
        if (booking.status === 'CONFIRMED') {
          const refund = await tx.orm.public.Refund.create({
            bookingId: booking.id,
            amountPiastres: booking.totalPiastres,
          });
          await recordAudit(tx, auth, 'Refund', refund.id, null, refund);
        }
        if (booking.status !== 'EXPIRED')
          await tx.orm.public.BookingNotice.create({
            bookingId: booking.id,
            purpose: 'TRIP_CANCELLED',
          });
      }
      await recordAudit(tx, auth, 'Trip', tripId, trip, saved);
      return { id: tripId, status: 'CANCELLED', cancelledAt: now };
    });
  },
};
