import {
  loadLockedBooking,
  hasBookingSeats,
  releaseBookingSeats,
} from './bookingHoldService.ts';
import { z } from 'zod';
import type { PaymentProvider } from '../payments/paymentProvider.ts';
import {
  verifiedPayment,
  verifiedReferencePayment,
} from '../payments/paymentVerification.ts';
import { createPaymobProvider } from '../payments/paymobProvider.ts';

type Decision = { state: string };
export function createPaymentReconciliationService(
  provider: Pick<
    PaymentProvider,
    'getTransaction' | 'getTransactionByReference'
  >,
  scope: { integrationId: number; ownerId: number },
) {
  const scopeId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
  const integrationId = String(scopeId.parse(scope.integrationId));
  const ownerId = String(scopeId.parse(scope.ownerId));
  async function reconcile(paymentSessionId: string): Promise<Decision> {
    const { db } = await import('../prisma/db.ts');
    let initial = await db.orm.public.PaymentSession.where({
      id: paymentSessionId,
    }).first();
    if (!initial) return { state: 'WAITING' };
    if (initial.integrationId !== integrationId || initial.ownerId !== ownerId)
      return { state: 'MISMATCH' };
    const existing = await db.orm.public.PaymentSettlement.where({
      paymentSessionId,
    }).first();
    if (existing) return { state: existing.status };
    const attempt = await db.orm.public.PaymentAttempt.where({
      id: initial.paymentAttemptId,
    }).first();
    if (!attempt) return { state: 'MISMATCH' };
    const initialBooking = await db.orm.public.Booking.where({
      id: attempt.bookingId,
    }).first();
    if (!initialBooking) return { state: 'MISMATCH' };
    if (
      initial.status === 'REQUESTING' &&
      Date.parse(initial.createdAt) > Date.now() - 30000
    )
      return { state: 'WAITING' };
    const candidates: string[] = [];
    if (initial.orderId) {
      const events = await db.orm.public.PaymentEvent.where({
        orderId: initial.orderId,
        integrationId,
        ownerId,
      })
        .orderBy((e) => e.receivedAt.desc())
        .limit(20)
        .all();
      candidates.push(...new Set(events.map((e) => e.transactionId)));
    }
    // Query the latest reference too: an old failed callback must not hide a
    // later successful attempt whose callback was lost.
    let referenceUnavailable = false;
    try {
      const raw = await provider.getTransactionByReference(initial.id);
      const recovered = verifiedReferencePayment(raw, {
        reference: initial.id,
        orderId: initial.orderId,
        integrationId,
        ownerId,
        amountPiastres: attempt.amountPiastres,
      });
      if (recovered) {
        if (!initial.orderId) {
          await db.orm.public.PaymentSession.where({
            id: initial.id,
            orderId: null,
            status: initial.status,
          }).update({
            orderId: recovered.orderId,
            status: 'UNKNOWN',
            encryptedCheckoutUrl: null,
            updatedAt: new Date().toISOString(),
          });
          initial = await db.orm.public.PaymentSession.where({
            id: initial.id,
          }).first();
          if (!initial || initial.orderId !== recovered.orderId)
            return { state: 'MISMATCH' };
        }
        candidates.unshift(recovered.id);
      } else if (!candidates.length) return { state: 'MISMATCH' };
    } catch {
      referenceUnavailable = true;
    }
    if (!candidates.length && referenceUnavailable) return { state: 'RETRY' };
    if (!initial?.orderId) return { state: 'WAITING' };
    let sawVerified = false;
    for (const transactionId of [...new Set(candidates)].slice(0, 10)) {
      let raw: unknown;
      try {
        raw = await provider.getTransaction(transactionId);
      } catch {
        return { state: 'RETRY' };
      }
      const remote = verifiedPayment(raw, {
        transactionId,
        orderId: initial.orderId,
        integrationId,
        ownerId,
        amountPiastres: attempt.amountPiastres,
      });
      if (!remote) continue;
      // Auth-only and child transactions cannot confirm a direct payment.
      if (
        remote.authorization ||
        remote.capture ||
        !remote.standalone ||
        remote.parentTransactionId
      )
        continue;
      sawVerified = true;
      if (remote.pending || !remote.success) continue;
      return db.transaction(async (tx): Promise<Decision> => {
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."User" WHERE "id" = ${initialBooking.userId} FOR SHARE`
            .affectedCount()
            .build(),
        );
        const booking = await loadLockedBooking(tx, db, initialBooking);
        const operation = await tx.orm.public.PaymentSession.where({
          id: paymentSessionId,
        }).first();
        const snapshot = await tx.orm.public.PaymentAttempt.where({
          id: attempt.id,
        }).first();
        if (
          !booking ||
          !operation ||
          !snapshot ||
          operation.orderId !== remote.orderId ||
          operation.integrationId !== integrationId ||
          operation.ownerId !== ownerId ||
          snapshot.amountPiastres !== BigInt(remote.amountPiastres) ||
          snapshot.amountPiastres !== booking.totalPiastres ||
          snapshot.currency !== 'EGP' ||
          !booking.expiresAt ||
          Date.parse(snapshot.expiresAt) !== Date.parse(booking.expiresAt)
        )
          return { state: 'MISMATCH' };
        const settled = await tx.orm.public.PaymentSettlement.where({
          paymentSessionId,
        }).first();
        if (settled) return { state: settled.status };
        const now = new Date().toISOString();
        const trip = await tx.orm.public.Trip.where({
          id: booking.tripId,
        }).first();
        if (!trip) return { state: 'MISMATCH' };
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."Route" WHERE "id" = ${trip.routeId} FOR SHARE`
            .affectedCount()
            .build(),
        );
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."Bus" WHERE "id" = ${trip.busId} FOR SHARE`
            .affectedCount()
            .build(),
        );
        const route = await tx.orm.public.Route.where({
          id: trip.routeId,
        }).first();
        const bus = await tx.orm.public.Bus.where({ id: trip.busId }).first();
        const user = await tx.orm.public.User.where({
          id: booking.userId,
        }).first();
        const seatsHeld = await hasBookingSeats(tx, booking);
        const review =
          remote.voided ||
          remote.refunded ||
          (remote.refundedPiastres ?? 0) > 0;
        await tx.orm.public.PaymentSettlement.create({
          paymentSessionId,
          transactionId: remote.id,
          kind: 'SALE',
          status: review ? 'REVIEW' : 'SUCCEEDED',
          amountPiastres: snapshot.amountPiastres,
        });
        await tx.orm.public.PaymentSession.where({
          id: paymentSessionId,
        }).update({
          reconciliationComplete: true,
          encryptedCheckoutUrl: null,
          status: 'EXPIRED',
          updatedAt: now,
        });
        if (review) return { state: 'REVIEW' };
        const eligible =
          booking.status === 'PENDING_PAYMENT' &&
          seatsHeld &&
          Date.parse(booking.expiresAt) > Date.now() &&
          trip.status === 'SCHEDULED' &&
          Date.parse(trip.departureAt) > Date.now() &&
          route?.isActive &&
          bus?.isActive &&
          user?.isActive &&
          user.emailVerifiedAt;
        if (eligible) {
          await tx.orm.public.Booking.where({ id: booking.id }).update({
            status: 'CONFIRMED',
          });
          await tx.orm.public.Ticket.create({ bookingId: booking.id });
          return { state: 'SUCCEEDED' };
        }
        // A late successful charge never reclaims a released/reallocated seat.
        // Record the debt atomically; only the super admin may send its refund.
        await releaseBookingSeats(tx, booking.id, now);
        await tx.orm.public.Booking.where({ id: booking.id }).update({
          status: 'EXPIRED',
        });
        await tx.orm.public.Refund.create({
          bookingId: booking.id,
          amountPiastres: booking.totalPiastres,
        });
        return { state: 'REFUND_REQUIRED' };
      });
    }
    // An unsuccessful transaction does not prove another attempt on the checkout cannot succeed.
    // Keep inquiries active; the hold worker expires seats independently.
    return { state: sawVerified ? 'WAITING' : 'MISMATCH' };
  }
  return {
    reconcile,
    async runBatch(limit = 20) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw new Error('Invalid payment batch size');
      const { db } = await import('../prisma/db.ts');
      const rows = await db.orm.public.PaymentSession.where({
        reconciliationComplete: false,
      })
        .where((p) => p.nextReconcileAt.lte(new Date().toISOString()))
        .orderBy((p) => p.nextReconcileAt.asc())
        .limit(limit)
        .all();
      const counts = {
        checked: 0,
        review: 0,
        retry: 0,
        mismatched: 0,
        failed: 0,
      };
      for (const row of rows) {
        try {
          const result = await reconcile(row.id);
          counts.checked++;
          if (result.state === 'REVIEW') counts.review++;
          if (result.state === 'RETRY') counts.retry++;
          if (result.state === 'MISMATCH') counts.mismatched++;
        } catch {
          counts.failed++;
        } finally {
          await db.orm.public.PaymentSession.where({ id: row.id }).update({
            nextReconcileAt: new Date(Date.now() + 30000).toISOString(),
          });
        }
      }
      return counts;
    },
  };
}
export function configuredPaymentReconciliation() {
  const flag = process.env.PAYMOB_RECONCILIATION_ENABLED;
  if (flag === undefined || flag === 'false') return null;
  if (flag !== 'true')
    throw new Error(
      'Invalid payment configuration: PAYMOB_RECONCILIATION_ENABLED',
    );
  if (![undefined, 'true', 'false'].includes(process.env.PAYMOB_ENABLED))
    throw new Error('Invalid payment configuration: PAYMOB_ENABLED');
  if (process.env.PAYMOB_ENABLED !== 'true')
    throw new Error('Payment reconciliation requires PAYMOB_ENABLED');
  return createPaymentReconciliationService(createPaymobProvider(), {
    integrationId: Number(process.env.PAYMOB_INTEGRATION_ID),
    ownerId: Number(process.env.PAYMOB_OWNER_ID),
  });
}
