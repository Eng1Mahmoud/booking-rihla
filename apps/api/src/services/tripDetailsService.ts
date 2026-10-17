import { bookingState } from './bookingHoldService.ts';
import { busMetadata } from '../utils/busMetadata.ts';
import type { db as database } from '../prisma/db.ts';

// Search, details and seats share the same passenger eligibility rules.
function passengerTrips(db: typeof database, id: string) {
  return db.orm.public.Trip.where({ id, status: 'SCHEDULED' })
    .where((trip) => trip.departureAt.gt(new Date().toISOString()))
    .where((trip) => trip.route.some({ isActive: true }))
    .where((trip) => trip.bus.some({ isActive: true }));
}
export const tripDetailsService = {
  async findById(id: string) {
    const { db } = await import('../prisma/db.ts');
    const trip = await passengerTrips(db, id)
      .include('bus', (bus) =>
        bus
          .select('id', 'seatCount', 'seatLayout')
          .include('busType')
          .include('amenityLinks', (links) => links.include('amenity')),
      )
      .include('route', (route) =>
        route
          .include('originStation', (station) => station.include('city'))
          .include('destinationStation', (station) => station.include('city')),
      )
      .first();
    if (!trip || !trip.bus) return null;
    return {
      ...trip,
      bus: {
        id: trip.bus.id,
        seatCount: trip.bus.seatCount,
        seatLayout: trip.bus.seatLayout,
        ...busMetadata(trip.bus),
      },
      departureAt: new Date(trip.departureAt).toISOString(),
      arrivalAt: new Date(trip.arrivalAt).toISOString(),
    };
  },
  async listSeats(id: string) {
    const { db } = await import('../prisma/db.ts');
    // Read eligibility and the current bus seats in one query/snapshot.
    const trip = await passengerTrips(db, id)
      .select('id', 'busId')
      .include('bookings', (bookings) =>
        bookings
          .select('id', 'status', 'expiresAt')
          .include('seats', (seats) =>
            seats.where({ releasedAt: null }).select('seatId'),
          ),
      )
      .include('bus', (bus) =>
        bus
          .select('id', 'seatLayout')
          .include('seats', (seats) =>
            seats.select('id', 'number').orderBy((seat) => seat.number.asc()),
          ),
      )
      .first();
    if (!trip || !trip.bus) return null;
    const reserved = new Set(
      trip.bookings
        .filter((booking) => bookingState(booking) !== 'EXPIRED')
        .flatMap((booking) => booking.seats.map((seat) => seat.seatId)),
    );
    const seats = trip.bus.seats.map((seat) => ({
      ...seat,
      isAvailable: !reserved.has(seat.id),
    }));
    return {
      seatLayout: trip.bus.seatLayout,
      tripId: trip.id,
      busId: trip.busId,
      totalSeats: seats.length,
      availableSeats: seats.filter((seat) => seat.isAvailable).length,
      seats,
    };
  },
};
export type TripDetailsService = typeof tripDetailsService;
