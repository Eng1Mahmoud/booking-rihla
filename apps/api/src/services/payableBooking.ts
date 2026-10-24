import { loadLockedBooking, hasBookingSeats } from './bookingHoldService.ts';
import { AppError } from '../errors/AppError.ts';
import type { AuthContext } from './sessionService.ts';
import type { db as database } from '../prisma/db.ts';
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
type Row<T> = NonNullable<Awaited<T>>;
type Context = {
  tx: Transaction;
  db: typeof database;
  booking: Row<ReturnType<typeof database.orm.public.Booking.first>> & {
    expiresAt: string;
  };
  user: Row<ReturnType<typeof database.orm.public.User.first>>;
};
const missingBooking = () =>
  new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
const expired = () =>
  new AppError(
    409,
    'BOOKING_EXPIRED',
    'This booking is too close to expiry or has expired',
  );
// One lock order and eligibility check for preparation and provider-operation claims.
// The callback must only access the database: never perform network I/O here.
export async function withPayableBooking<T>(
  auth: AuthContext,
  bookingId: string,
  work: (context: Context) => Promise<T>,
): Promise<T> {
  const { db } = await import('../prisma/db.ts');
  return db.transaction(async (tx) => {
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
    const booking = await loadLockedBooking(tx, db, initial, user.id);
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
    const seatsHeld = await hasBookingSeats(tx, booking);
    if (!seatsHeld)
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

    if (
      Date.parse(booking.expiresAt!) - Date.now() < 1000 ||
      Date.parse(trip.departureAt) <= Date.now()
    )
      throw expired();
    if (Date.parse(session.expiresAt) <= Date.now())
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    const result = await work({
      tx,
      db,
      user,
      booking: { ...booking, expiresAt: booking.expiresAt! },
    });
    // Database work may itself wait: check the deadline again before committing.
    if (
      Date.parse(booking.expiresAt!) - Date.now() < 1000 ||
      Date.parse(trip.departureAt) <= Date.now()
    )
      throw expired();
    if (Date.parse(session.expiresAt) <= Date.now())
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return result;
  });
}
