import { z } from 'zod';
import type { PaymentProvider } from '../payments/paymentProvider.ts';
import { verifiedPayment } from '../payments/paymentVerification.ts';
import { parsePaymobEnv } from '../config/paymob.ts';
import { createPaymobProvider } from '../payments/paymobProvider.ts';
type Kind = 'CAPTURE' | 'VOID';
type Decision = {
  state: string;
  send?: Kind;
  settlementId?: string;
  transactionId?: string;
  amount?: number;
};
const terminal = (status: string) =>
  status === 'SUCCEEDED' || status === 'REVIEW';
export function createPaymentReconciliationService(
  provider: Pick<
    PaymentProvider,
    'getTransaction' | 'capture' | 'voidAuthorization'
  >,
  scope: { integrationId: number; ownerId: number },
) {
  const integrationId = String(
    z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .parse(scope.integrationId),
  );
  const ownerId = String(
    z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .parse(scope.ownerId),
  );
  async function reconcile(
    authorizationId: string,
    followUp = false,
  ): Promise<Decision> {
    const { db } = await import('../prisma/db.ts');
    const initial = await db.orm.public.PaymentAuthorization.where({
      id: authorizationId,
    }).first();
    if (!initial?.orderId) return { state: 'WAITING' };
    if (initial.integrationId !== integrationId || initial.ownerId !== ownerId)
      return { state: 'MISMATCH' };
    const existing = await db.orm.public.PaymentSettlement.where({
      authorizationId,
    }).first();
    if (existing && terminal(existing.status))
      return { state: existing.status };
    const attempt = await db.orm.public.PaymentAttempt.where({
      id: initial.paymentAttemptId,
    }).first();
    if (!attempt) return { state: 'MISMATCH' };
    const initialBooking = await db.orm.public.Booking.where({
      id: attempt.bookingId,
    }).first();
    if (!initialBooking) return { state: 'MISMATCH' };
    let candidates = existing ? [existing.transactionId] : [];
    if (!existing) {
      const events = await db.orm.public.PaymentEvent.where({
        orderId: initial.orderId,
        integrationId,
        ownerId,
      })
        .orderBy((e) => e.receivedAt.desc())
        .limit(20)
        .all();
      candidates = [
        ...new Set(
          events
            .filter((event) => {
              try {
                const signed = JSON.parse(event.signedJson) as Record<
                  string,
                  unknown
                >;
                return (
                  signed['authorization'] === true &&
                  signed['capture'] === false &&
                  signed['standalone'] === false
                );
              } catch {
                return false;
              }
            })
            .map((event) => event.transactionId),
        ),
      ].slice(0, 5);
    }
    let sawVerified = false;
    for (const transactionId of candidates) {
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
      if (!remote.authorization || remote.capture || remote.standalone)
        continue;
      sawVerified = true;
      if (
        (remote.pending || !remote.success) &&
        !remote.voided &&
        !remote.refunded &&
        remote.capturedPiastres === 0
      )
        continue;
      const decision = await db.transaction(async (tx): Promise<Decision> => {
        // Same account/trip/catalog lock order as checkout. Inquiry already finished.
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."User" WHERE "id" = ${initialBooking.userId} FOR SHARE`
            .affectedCount()
            .build(),
        );
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."Trip" WHERE "id" = ${initialBooking.tripId} FOR UPDATE`
            .affectedCount()
            .build(),
        );
        const booking = await tx.orm.public.Booking.where({
          id: initialBooking.id,
        }).first();
        const operation = await tx.orm.public.PaymentAuthorization.where({
          id: authorizationId,
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
        const settlement = await tx.orm.public.PaymentSettlement.where({
          authorizationId,
        }).first();
        if (settlement && terminal(settlement.status))
          return { state: settlement.status };
        if (
          settlement &&
          (settlement.transactionId !== remote.id ||
            settlement.amountPiastres !== snapshot.amountPiastres)
        )
          return { state: 'MISMATCH' };
        const seats = await tx.orm.public.BookingSeat.where({
          bookingId: booking.id,
          tripId: booking.tripId,
          releasedAt: null,
        }).all();
        const ownsSeats = seats.length === booking.seatCount;
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
        const now = new Date().toISOString();
        async function save(
          kind: Kind,
          status: 'REQUESTED' | 'UNKNOWN' | 'SUCCEEDED' | 'REVIEW',
        ) {
          return settlement
            ? tx.orm.public.PaymentSettlement.where({
                id: settlement.id,
              }).update({ status, updatedAt: now })
            : tx.orm.public.PaymentSettlement.create({
                authorizationId,
                transactionId: remote!.id,
                kind,
                status,
                amountPiastres: snapshot!.amountPiastres,
              });
        }
        async function complete() {
          await tx.orm.public.PaymentAuthorization.where({
            id: authorizationId,
          }).update({
            reconciliationComplete: true,
            encryptedCheckoutUrl: null,
            status: 'EXPIRED',
          });
        }
        async function releaseSeats() {
          if (booking!.status === 'CONFIRMED') return;
          await tx.orm.public.BookingSeat.where({
            bookingId: booking!.id,
            releasedAt: null,
          }).updateAll({ releasedAt: now });
          await tx.orm.public.Booking.where({ id: booking!.id }).update({
            status: 'EXPIRED',
          });
        }
        async function review(): Promise<Decision> {
          await save(settlement?.kind ?? 'CAPTURE', 'REVIEW');
          // Preserve remaining allocations if unexpected money was observed. Never
          // reclaim a seat already released/reallocated to another passenger.
          if (booking!.status === 'PENDING_PAYMENT')
            await tx.orm.public.Booking.where({ id: booking!.id }).update({
              status: 'PAYMENT_PROCESSING',
            });
          await complete();
          return { state: 'REVIEW' };
        }
        if (
          remote.refunded ||
          (remote.voided && (remote.capturedPiastres > 0 || remote.pending)) ||
          (remote.capturedPiastres > 0 && (remote.pending || !remote.success))
        )
          return review();
        if (remote.capturedPiastres > 0) {
          if (
            remote.capturedPiastres !== remote.amountPiastres ||
            settlement?.kind !== 'CAPTURE' ||
            booking.status !== 'PAYMENT_PROCESSING' ||
            !ownsSeats ||
            trip.status !== 'SCHEDULED'
          )
            return review();
          await tx.orm.public.Booking.where({ id: booking.id }).update({
            status: 'CONFIRMED',
          });
          await save('CAPTURE', 'SUCCEEDED');
          await complete();
          return { state: 'SUCCEEDED' };
        }
        if (remote.voided) {
          if (booking.status === 'CONFIRMED') return review();
          await releaseSeats();
          const state = settlement?.kind === 'CAPTURE' ? 'REVIEW' : 'SUCCEEDED';
          await save(settlement?.kind ?? 'VOID', state);
          await complete();
          return { state };
        }
        // A previous durable claim may have been sent, even if inquiry is stale.
        // Never send it again, including after process crashes or provider errors.
        if (settlement) {
          await save(settlement.kind, 'UNKNOWN');
          return { state: 'UNKNOWN' };
        }
        if (
          booking.status === 'PAYMENT_PROCESSING' ||
          booking.status === 'CONFIRMED'
        )
          return review();
        const eligible =
          booking.status === 'PENDING_PAYMENT' &&
          ownsSeats &&
          Date.parse(booking.expiresAt) - Date.now() >= 1000 &&
          trip.status === 'SCHEDULED' &&
          Date.parse(trip.departureAt) > Date.now() &&
          route?.isActive &&
          bus?.isActive &&
          user?.isActive &&
          user.emailVerifiedAt;
        const kind = eligible ? 'CAPTURE' : 'VOID';
        if (kind === 'CAPTURE')
          await tx.orm.public.Booking.where({ id: booking.id }).update({
            status: 'PAYMENT_PROCESSING',
          });
        else await releaseSeats();
        const claimed = await save(kind, 'REQUESTED');
        if (!claimed) throw new Error('Unable to persist payment settlement');
        return {
          state: 'REQUESTED',
          send: kind,
          settlementId: claimed.id,
          transactionId: remote.id,
          amount: remote.amountPiastres,
        };
      });
      if (!decision.send || followUp) return decision;
      // No database locks are held while the provider is contacted. ACK or failure
      // both lead to inquiry; neither is proof of collection/void completion.
      try {
        if (decision.send === 'CAPTURE')
          await provider.capture(decision.transactionId!, decision.amount!);
        else await provider.voidAuthorization(decision.transactionId!);
      } catch {
        /* Outcome may be unknown. Reconcile; never retry a money POST. */
      }
      await db.orm.public.PaymentSettlement.where({
        id: decision.settlementId!,
        status: 'REQUESTED',
      }).update({ status: 'UNKNOWN', updatedAt: new Date().toISOString() });
      return reconcile(authorizationId, true);
    }
    return {
      state: sawVerified
        ? 'WAITING'
        : candidates.length
          ? 'MISMATCH'
          : 'WAITING',
    };
  }
  return {
    reconcile,
    async runBatch(limit = 20) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw new Error('Invalid payment batch size');
      const { db } = await import('../prisma/db.ts');
      const rows = await db.orm.public.PaymentAuthorization.where({
        reconciliationComplete: false,
      })
        .where((p) => p.orderId.isNotNull())
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
          await db.orm.public.PaymentAuthorization.where({ id: row.id }).update(
            { nextReconcileAt: new Date(Date.now() + 30000).toISOString() },
          );
        }
      }
      return counts;
    },
  };
}
export function configuredPaymentReconciliation() {
  const flag = process.env['PAYMOB_RECONCILIATION_ENABLED'];
  if (flag === undefined || flag === 'false') return null;
  if (flag !== 'true')
    throw new Error(
      'Invalid payment configuration: PAYMOB_RECONCILIATION_ENABLED',
    );
  const config = parsePaymobEnv(process.env);
  if (!config)
    throw new Error('Payment reconciliation requires PAYMOB_ENABLED');
  return createPaymentReconciliationService(createPaymobProvider(config), {
    integrationId: config.PAYMOB_INTEGRATION_ID,
    ownerId: config.PAYMOB_OWNER_ID,
  });
}
