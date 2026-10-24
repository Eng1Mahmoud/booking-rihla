import {
  bookingState,
  createBookingHold,
  lockBookingTrip,
} from './bookingHoldService.ts';
import { AppError } from '../errors/AppError.ts';
import { isUniqueViolation } from '../utils/databaseErrors.ts';
import type {
  CreateBookingInput,
  BookingListQuery,
} from '../schemas/bookingSchema.ts';
import type { AuthContext } from './sessionService.ts';
import type { db as database } from '../prisma/db.ts';
export function bookingRecords(db: Pick<typeof database, 'orm'>) {
  return db.orm.public.Booking.include('refund').include('trip', (trip) =>
    trip.include('route', (route) =>
      route
        .include('originStation', (station) => station.include('city'))
        .include('destinationStation', (station) => station.include('city')),
    ),
  );
}
function ownBookings(db: typeof database, userId: string) {
  return bookingRecords(db)
    .where({ userId })
    .include('seats', (seats) =>
      seats.orderBy((seat) => seat.seatNumber.asc()),
    );
}
type BookingRecord = NonNullable<
  Awaited<ReturnType<ReturnType<typeof ownBookings>['first']>>
>;
export function serializeBookingSummary(
  booking: Omit<BookingRecord, 'seats'>,
  now = Date.now(),
) {
  if (!booking.trip || !booking.trip.route)
    throw new Error('Reservation trip relation is missing');
  const status = bookingState(booking, now);
  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.trip.status === 'CANCELLED' ? 'CANCELLED' : status,
    paymentRequired:
      booking.trip.status === 'SCHEDULED' && status === 'PENDING_PAYMENT',
    expiresAt: booking.expiresAt
      ? new Date(booking.expiresAt).toISOString()
      : null,
    refund: booking.refund
      ? {
          id: booking.refund.id,
          status: booking.refund.status,
          amountPiastres: booking.refund.amountPiastres.toString(),
        }
      : null,
    currency: 'EGP',
    contactPhone: booking.contactPhone,
    seatCount: booking.seatCount,
    unitPricePiastres: booking.unitPricePiastres,
    // At most 100 seats * an int32 price: conversion stays below Number.MAX_SAFE_INTEGER.
    totalPiastres: Number(booking.totalPiastres),
    createdAt: new Date(booking.createdAt).toISOString(),
    trip: {
      id: booking.trip.id,
      busId: booking.trip.busId,
      status: booking.trip.status,
      cancelledAt: booking.trip.cancelledAt,
      departureAt: new Date(booking.trip.departureAt).toISOString(),
      arrivalAt: new Date(booking.trip.arrivalAt).toISOString(),
      route: booking.trip.route,
    },
  };
}
function serializeBooking(booking: BookingRecord, now = Date.now()) {
  return {
    ...serializeBookingSummary(booking, now),
    passengers: booking.seats.map((seat) => ({
      seatId: seat.seatId,
      seatNumber: seat.seatNumber,
      name: seat.passengerName,
    })),
  };
}
export const bookingService = {
  async create(auth: AuthContext, input: CreateBookingInput) {
    const { db } = await import('../prisma/db.ts');
    let id: string;
    try {
      id = await db.transaction(async (tx) => {
        // Match reset's User -> Session lock order; logout/reset cannot commit in the middle.
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."User" WHERE "id" = ${auth.user.id} FOR SHARE`
            .affectedCount()
            .build(),
        );
        const user = await tx.orm.public.User.where({
          id: auth.user.id,
        }).first();
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
        // Serializes reservations with each other and trip edits/deletion.
        await lockBookingTrip(tx, db, input.tripId);
        const trip = await tx.orm.public.Trip.where({
          id: input.tripId,
        }).first();
        if (!trip) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found');
        // Same parent lock order as tripService: Trip -> Route -> Bus.
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
        // Serialize catalog definition edits with the first reservation for this bus.
        const currentBus = await tx.orm.public.Bus.where({
          id: trip.busId,
        }).first();
        if (currentBus?.busTypeId)
          await tx.execute(
            db.raw
              .sql`SELECT "id" FROM "public"."BusType" WHERE "id" = ${currentBus.busTypeId} FOR SHARE`
              .affectedCount()
              .build(),
          );
        await tx.execute(
          db.raw
            .sql`SELECT a."id" FROM "public"."Amenity" a JOIN "public"."BusAmenity" ba ON ba."amenityId" = a."id" WHERE ba."busId" = ${trip.busId} ORDER BY a."id" FOR SHARE OF a`
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
            'This trip cannot accept reservations',
          );
        return createBookingHold(tx, db, user.id, trip, input);
      });
    } catch (error) {
      if (isUniqueViolation(error, 'booking_seat_active_unique_225b95a2'))
        throw new AppError(
          409,
          'SEAT_UNAVAILABLE',
          'One or more selected seats are already reserved',
        );
      throw error;
    }
    const booking = await ownBookings(db, auth.user.id).where({ id }).first();
    if (!booking) throw new Error('Created reservation could not be read');
    return serializeBooking(booking);
  },
  async list(
    userId: string,
    { limit, offset, filter = 'all' }: BookingListQuery,
  ) {
    const { db } = await import('../prisma/db.ts');
    const now = Date.now();
    const timestamp = new Date(now).toISOString();
    let query = ownBookings(db, userId);
    if (filter !== 'all')
      query = query.where((booking) =>
        booking.trip.some({
          status: filter === 'cancelled' ? 'CANCELLED' : 'SCHEDULED',
        }),
      );
    if (filter === 'upcoming')
      query = query
        .where((booking) =>
          booking.trip.some((trip) => trip.departureAt.gt(timestamp)),
        )
        .where((booking, { fns }) =>
          fns.or(
            booking.status.in(['RESERVED', 'CONFIRMED', 'PAYMENT_PROCESSING']),
            fns.and(
              booking.status.eq('PENDING_PAYMENT'),
              booking.expiresAt.gt(timestamp),
            ),
          ),
        );
    else if (filter === 'past')
      query = query
        .where({ status: 'CONFIRMED' })
        .where((booking) =>
          booking.trip.some((trip) => trip.departureAt.lte(timestamp)),
        );
    else if (filter === 'expired')
      query = query.where((booking, { fns }) =>
        fns.or(
          booking.status.eq('EXPIRED'),
          fns.and(
            booking.status.eq('PENDING_PAYMENT'),
            booking.expiresAt.lte(timestamp),
          ),
        ),
      );
    // Filter the owner's full history first; one extra row gives an accurate next page.
    const bookings = await query
      .orderBy([
        (booking) => booking.createdAt.desc(),
        (booking) => booking.id.asc(),
      ])
      .limit(limit + 1)
      .offset(offset)
      .all();
    return {
      items: bookings
        .slice(0, limit)
        .map((booking) => serializeBooking(booking, now)),
      pagination: { limit, offset, filter, hasMore: bookings.length > limit },
    };
  },
  async findById(userId: string, id: string) {
    const { db } = await import('../prisma/db.ts');
    const booking = await ownBookings(db, userId).where({ id }).first();
    return booking ? serializeBooking(booking) : null;
  },
};
export type BookingService = typeof bookingService;
