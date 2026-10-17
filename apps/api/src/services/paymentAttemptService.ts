import { AppError } from '../errors/AppError.ts';
import type { AuthContext } from './sessionService.ts';
import type { db as database } from '../prisma/db.ts';

type Attempt = NonNullable<
  Awaited<ReturnType<typeof database.orm.public.PaymentAttempt.first>>
>;
function serialize(attempt: Attempt) {
  return {
    id: attempt.id,
    bookingId: attempt.bookingId,
    status:
      Date.parse(attempt.expiresAt) <= Date.now()
        ? ('EXPIRED' as const)
        : ('PREPARED' as const),
    amountPiastres: Number(attempt.amountPiastres),
    currency: attempt.currency,
    expiresAt: new Date(attempt.expiresAt).toISOString(),
    createdAt: new Date(attempt.createdAt).toISOString(),
  };
}
const missingBooking = () =>
  new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
const expired = () =>
  new AppError(
    409,
    'BOOKING_EXPIRED',
    'This booking is too close to expiry or has expired',
  );
export const paymentAttemptService = {
  async prepare(auth: AuthContext, bookingId: string, idempotencyKey: string) {
    const { db } = await import('../prisma/db.ts');
    const result = await db.transaction(async (tx) => {
      // Same lock order as booking creation/reset: User -> Session -> Trip -> Route -> Bus.
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."User" WHERE "id" = ${auth.user.id} FOR SHARE`
          .affectedCount()
          .build(),
      );
      const user = await tx.orm.public.User.where({ id: auth.user.id }).first();
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."Session" WHERE "id" = ${auth.sessionId} FOR SHARE`
          .affectedCount()
          .build(),
      );
      const session = await tx.orm.public.Session.where({
        id: auth.sessionId,
        userId: auth.user.id,
      }).first();
      if (
        !user?.isActive ||
        !user.emailVerifiedAt ||
        !session ||
        session.revokedAt ||
        Date.parse(session.expiresAt) <= Date.now()
      )
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      const initial = await tx.orm.public.Booking.where({
        id: bookingId,
        userId: user.id,
      }).first();
      if (!initial) throw missingBooking();
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."Trip" WHERE "id" = ${initial.tripId} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      // Re-read after acquiring the Trip lock; expiry/reallocation may have won the race.
      const booking = await tx.orm.public.Booking.where({
        id: bookingId,
        userId: user.id,
      }).first();
      if (!booking) throw missingBooking();
      if (booking.status === 'EXPIRED') throw expired();
      if (booking.status !== 'PENDING_PAYMENT' || !booking.expiresAt)
        throw new AppError(
          409,
          'BOOKING_NOT_PAYABLE',
          'This booking cannot prepare a payment',
        );
      if (Date.parse(booking.expiresAt) - Date.now() < 1000) throw expired();
      const trip = await tx.orm.public.Trip.where({
        id: booking.tripId,
      }).first();
      if (!trip) throw missingBooking();
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
      if (
        trip.status !== 'SCHEDULED' ||
        Date.parse(trip.departureAt) <= Date.now() ||
        !route?.isActive ||
        !bus?.isActive
      )
        throw new AppError(
          409,
          'TRIP_UNAVAILABLE',
          'This trip cannot accept payments',
        );
      const seats = await tx.orm.public.BookingSeat.where({
        bookingId,
        tripId: trip.id,
        releasedAt: null,
      }).all();
      if (seats.length !== booking.seatCount)
        throw new AppError(
          409,
          'BOOKING_SEATS_UNAVAILABLE',
          'The booking no longer holds all selected seats',
        );
      if (booking.totalPiastres <= 0n)
        throw new AppError(
          409,
          'PAYMENT_NOT_REQUIRED',
          'This booking has no payable amount',
        );
      const existing = await tx.orm.public.PaymentAttempt.where({
        bookingId,
      }).first();
      if (
        Date.parse(booking.expiresAt) - Date.now() < 1000 ||
        Date.parse(trip.departureAt) <= Date.now()
      )
        throw expired();
      if (Date.parse(session.expiresAt) <= Date.now())
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      if (existing) {
        if (existing.idempotencyKey !== idempotencyKey)
          throw new AppError(
            409,
            'PAYMENT_ATTEMPT_EXISTS',
            'Use the original idempotency key or retrieve the existing payment attempt',
          );
        if (
          existing.amountPiastres !== booking.totalPiastres ||
          Date.parse(existing.expiresAt) !== Date.parse(booking.expiresAt)
        )
          throw new AppError(
            409,
            'PAYMENT_ATTEMPT_MISMATCH',
            'The payment attempt no longer matches this booking',
          );
        return { attempt: existing, created: false };
      }
      const attempt = await tx.orm.public.PaymentAttempt.create({
        bookingId,
        idempotencyKey,
        amountPiastres: booking.totalPiastres,
        currency: 'EGP',
        expiresAt: booking.expiresAt,
      });
      return { attempt, created: true };
    });
    return { data: serialize(result.attempt), created: result.created };
  },
  async findByBooking(userId: string, bookingId: string) {
    const { db } = await import('../prisma/db.ts');
    const booking = await db.orm.public.Booking.where({
      id: bookingId,
      userId,
    }).first();
    if (!booking) throw missingBooking();
    const attempt = await db.orm.public.PaymentAttempt.where({
      bookingId,
    }).first();
    return attempt ? serialize(attempt) : null;
  },
};
export type PaymentAttemptService = typeof paymentAttemptService;
