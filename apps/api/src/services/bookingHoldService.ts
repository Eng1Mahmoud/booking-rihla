import type { db as database } from '../prisma/db.ts';
import { randomBytes } from 'node:crypto';
import { AppError } from '../errors/AppError.ts';
import type { CreateBookingInput } from '../schemas/bookingSchema.ts';
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
type Booking = NonNullable<
  Awaited<ReturnType<typeof database.orm.public.Booking.first>>
>;

// All allocation changes share this lock within the caller's transaction.
// Keep account/session locks before it, and Route/Bus locks after it.
export async function lockBookingTrip(
  tx: Transaction,
  db: typeof database,
  tripId: string,
) {
  await tx.execute(
    db.raw
      .sql`SELECT "id" FROM "public"."Trip" WHERE "id" = ${tripId} FOR UPDATE`
      .affectedCount()
      .build(),
  );
}

export async function loadLockedBooking(
  tx: Transaction,
  db: typeof database,
  initial: Pick<Booking, 'id' | 'tripId'>,
  userId?: string,
) {
  await lockBookingTrip(tx, db, initial.tripId);
  // Expiry, cancellation or reallocation may have won while we waited.
  const where =
    userId === undefined ? { id: initial.id } : { id: initial.id, userId };
  return tx.orm.public.Booking.where(where).first();
}

// Caller holds the Trip lock until its transaction commits or rolls back.
export async function hasBookingSeats(
  tx: Transaction,
  booking: Pick<Booking, 'id' | 'tripId' | 'seatCount'>,
) {
  const seats = await tx.orm.public.BookingSeat.where({
    bookingId: booking.id,
    tripId: booking.tripId,
    releasedAt: null,
  }).all();
  return seats.length === booking.seatCount;
}

// Never reclaim released seats; late payments and cancellation only release them.
export function releaseBookingSeats(
  tx: Transaction,
  bookingId: string,
  now: string,
) {
  return tx.orm.public.BookingSeat.where({
    bookingId,
    releasedAt: null,
  }).updateAll({ releasedAt: now });
}

export const holdDurationMs = 10 * 60 * 1000;
export function bookingState(
  booking: {
    status:
      | 'RESERVED'
      | 'PENDING_PAYMENT'
      | 'PAYMENT_PROCESSING'
      | 'CONFIRMED'
      | 'EXPIRED';
    expiresAt: string | null;
  },
  now = Date.now(),
) {
  return booking.status === 'PENDING_PAYMENT' &&
    booking.expiresAt &&
    Date.parse(booking.expiresAt) <= now
    ? 'EXPIRED'
    : booking.status;
}
// Caller must hold the Trip row FOR UPDATE; creation, expiry and payment confirmation share it.
export async function expireTripHolds(
  tx: Transaction,
  db: typeof database,
  tripId: string,
  now: string,
) {
  await tx.execute(
    db.raw
      .sql`UPDATE "public"."BookingSeat" s SET "releasedAt" = ${now}::timestamptz FROM "public"."Booking" b WHERE s."bookingId" = b."id" AND b."tripId" = ${tripId} AND b."status" = 'PENDING_PAYMENT' AND b."expiresAt" <= ${now}::timestamptz AND s."releasedAt" IS NULL`
      .affectedCount()
      .build(),
  );
  await tx.orm.public.Booking.where({ tripId, status: 'PENDING_PAYMENT' })
    .where((b) => b.expiresAt.lte(now))
    .updateAll({ status: 'EXPIRED' });
}

// The caller has locked and checked the trip and its catalog before allocating.
export async function createBookingHold(
  tx: Transaction,
  db: typeof database,
  userId: string,
  trip: {
    id: string;
    busId: string;
    departureAt: string;
    pricePiastres: number;
  },
  input: Pick<CreateBookingInput, 'contactPhone' | 'passengers'>,
) {
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
  const now = Date.now();
  await expireTripHolds(tx, db, trip.id, new Date(now).toISOString());
  const occupied = await tx.orm.public.BookingSeat.where({
    tripId: trip.id,
    releasedAt: null,
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
    userId,
    tripId: trip.id,
    status: 'PENDING_PAYMENT',
    expiresAt: new Date(
      Math.min(now + holdDurationMs, Date.parse(trip.departureAt)),
    ).toISOString(),
    reference: 'BUS-' + randomBytes(8).toString('hex').toUpperCase(),
    contactPhone: input.contactPhone,
    seatCount: input.passengers.length,
    unitPricePiastres: trip.pricePiastres,
    totalPiastres: BigInt(trip.pricePiastres) * BigInt(input.passengers.length),
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
}

export async function expireBookingHolds(limit = 100) {
  const { db } = await import('../prisma/db.ts');
  const candidates = await db.orm.public.Booking.where({
    status: 'PENDING_PAYMENT',
  })
    .where((b) => b.expiresAt.lte(new Date().toISOString()))
    .select('tripId')
    .orderBy((b) => b.expiresAt.asc())
    .limit(limit)
    .all();
  const trips = [...new Set(candidates.map((b) => b.tripId))].sort();
  for (const tripId of trips)
    await db.transaction(async (tx) => {
      await lockBookingTrip(tx, db, tripId);
      await expireTripHolds(tx, db, tripId, new Date().toISOString());
    });
  return { processedTrips: trips.length };
}
