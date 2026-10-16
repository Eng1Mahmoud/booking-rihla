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
      .include('bus', (bus) => bus.select('id', 'seatCount'))
      .include('route', (route) =>
        route
          .include('originStation', (station) => station.include('city'))
          .include('destinationStation', (station) => station.include('city')),
      )
      .first();
    if (!trip || !trip.bus) return null;
    return {
      ...trip,
      departureAt: new Date(trip.departureAt).toISOString(),
      arrivalAt: new Date(trip.arrivalAt).toISOString(),
    };
  },
  async listSeats(id: string) {
    const { db } = await import('../prisma/db.ts');
    // Read eligibility and the current bus seats in one query/snapshot.
    const trip = await passengerTrips(db, id)
      .select('id', 'busId')
      .include('bus', (bus) =>
        bus
          .select('id')
          .include('seats', (seats) =>
            seats.select('id', 'number').orderBy((seat) => seat.number.asc()),
          ),
      )
      .first();
    if (!trip || !trip.bus) return null;
    // There are no bookings yet. Add per-trip allocation checks with Booking.
    const seats = trip.bus.seats.map((seat) => ({
      ...seat,
      isAvailable: true,
    }));
    return {
      tripId: trip.id,
      busId: trip.busId,
      totalSeats: seats.length,
      availableSeats: seats.filter((seat) => seat.isAvailable).length,
      seats,
    };
  },
};
export type TripDetailsService = typeof tripDetailsService;
