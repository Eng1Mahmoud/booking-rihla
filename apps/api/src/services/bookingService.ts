import { randomBytes } from 'node:crypto';
import { AppError } from '../errors/AppError.ts';
import { isUniqueViolation } from '../utils/databaseErrors.ts';
import type {
  CreateBookingInput,
  BookingListQuery,
} from '../schemas/bookingSchema.ts';
import type { AuthContext } from './sessionService.ts';
import type { db as database } from '../prisma/db.ts';
function ownBookings(db: typeof database, userId: string) {
  return db.orm.public.Booking.where({ userId })
    .include('trip', (trip) =>
      trip.include('route', (route) =>
        route
          .include('originStation', (station) => station.include('city'))
          .include('destinationStation', (station) => station.include('city')),
      ),
    )
    .include('seats', (seats) =>
      seats.orderBy((seat) => seat.seatNumber.asc()),
    );
}
type BookingRecord = NonNullable<
  Awaited<ReturnType<ReturnType<typeof ownBookings>['first']>>
>;
function serializeBooking(booking: BookingRecord) {
  if (!booking.trip || !booking.trip.route)
    throw new Error('Reservation trip relation is missing');
  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    paymentRequired: false,
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
      departureAt: new Date(booking.trip.departureAt).toISOString(),
      arrivalAt: new Date(booking.trip.arrivalAt).toISOString(),
      route: booking.trip.route,
    },
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
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."Trip" WHERE "id" = ${input.tripId} FOR UPDATE`
            .affectedCount()
            .build(),
        );
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
        const busSeats = await tx.orm.public.BusSeat.where({
          busId: trip.busId,
        }).all();
        const selected = input.passengers.map((passenger) =>
          busSeats.find((seat) => seat.id === passenger.seatId),
        );
        if (
          selected.some((seat) => !seat) ||
          new Set(input.passengers.map((p) => p.seatId)).size !==
            input.passengers.length
        )
          throw new AppError(
            400,
            'INVALID_SEATS',
            'Choose distinct seats belonging to this trip bus',
          );
        const occupied = await tx.orm.public.BookingSeat.where({
          tripId: trip.id,
        }).all();
        if (
          input.passengers.some((passenger) =>
            occupied.some((seat) => seat.seatId === passenger.seatId),
          )
        )
          throw new AppError(
            409,
            'SEAT_UNAVAILABLE',
            'One or more selected seats are already reserved',
          );
        const booking = await tx.orm.public.Booking.create({
          userId: user.id,
          tripId: trip.id,
          reference: 'BUS-' + randomBytes(8).toString('hex').toUpperCase(),
          contactPhone: input.contactPhone,
          seatCount: input.passengers.length,
          unitPricePiastres: trip.pricePiastres,
          totalPiastres:
            BigInt(trip.pricePiastres) * BigInt(input.passengers.length),
        });
        await tx.orm.public.BookingSeat.createAll(
          input.passengers.map((passenger, index) => ({
            bookingId: booking.id,
            tripId: trip.id,
            seatId: passenger.seatId,
            seatNumber: selected[index]!.number,
            passengerName: passenger.name,
          })),
        );
        return booking.id;
      });
    } catch (error) {
      if (isUniqueViolation(error, 'BookingSeat_tripId_seatId_key'))
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
  async list(userId: string, { limit, offset }: BookingListQuery) {
    const { db } = await import('../prisma/db.ts');
    const bookings = await ownBookings(db, userId)
      .orderBy([
        (booking) => booking.createdAt.desc(),
        (booking) => booking.id.asc(),
      ])
      .limit(limit)
      .offset(offset)
      .all();
    return bookings.map(serializeBooking);
  },
  async findById(userId: string, id: string) {
    const { db } = await import('../prisma/db.ts');
    const booking = await ownBookings(db, userId).where({ id }).first();
    return booking ? serializeBooking(booking) : null;
  },
};
export type BookingService = typeof bookingService;
