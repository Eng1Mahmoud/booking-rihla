import type { db as database } from '../prisma/db.ts';
import type { AdminBookingListQuery } from '../schemas/adminBookingSchema.ts';
import { bookingRecords, serializeBookingSummary } from './bookingService.ts';
import { cairoDayBounds } from '../utils/cairoTime.ts';

function adminBookings(db: typeof database) {
  // Only project account fields needed by an operator; never load credentials or sessions.
  return bookingRecords(db).include('user', (user) =>
    user.select('id', 'name', 'email', 'phone'),
  );
}
type AdminBookingRecord = NonNullable<
  Awaited<ReturnType<ReturnType<typeof adminBookings>['first']>>
>;
function summary(booking: AdminBookingRecord) {
  if (!booking.user || !booking.trip)
    throw new Error('Booking relation is missing');
  const result = serializeBookingSummary(booking);
  return {
    ...result,
    customer: booking.user,
    trip: { ...result.trip, status: booking.trip.status },
  };
}
export const adminBookingService = {
  async list({
    limit,
    offset,
    reference,
    tripId,
    userId,
    email,
    travelDate,
  }: AdminBookingListQuery) {
    const { db } = await import('../prisma/db.ts');
    let query = adminBookings(db).where({
      ...(reference === undefined ? {} : { reference }),
      ...(tripId === undefined ? {} : { tripId }),
      ...(userId === undefined ? {} : { userId }),
    });
    if (email) query = query.where((booking) => booking.user.some({ email }));
    if (travelDate) {
      const { start, end } = cairoDayBounds(travelDate);
      query = query
        .where((booking) =>
          booking.trip.some((trip) => trip.departureAt.gte(start)),
        )
        .where((booking) =>
          booking.trip.some((trip) => trip.departureAt.lt(end)),
        );
    }
    const rows = await query
      .orderBy([
        (booking) => booking.createdAt.desc(),
        (booking) => booking.id.desc(),
      ])
      .limit(limit)
      .offset(offset)
      .all();
    return rows.map(summary);
  },
  async findById(id: string) {
    const { db } = await import('../prisma/db.ts');
    const booking = await adminBookings(db)
      .where({ id })
      .include('seats', (seats) =>
        seats.orderBy((seat) => seat.seatNumber.asc()),
      )
      .first();
    return booking
      ? {
          ...summary(booking),
          passengers: booking.seats.map((seat) => ({
            seatId: seat.seatId,
            seatNumber: seat.seatNumber,
            name: seat.passengerName,
          })),
        }
      : null;
  },
};
export type AdminBookingService = typeof adminBookingService;
