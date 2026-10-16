import { busMetadata } from '../utils/busMetadata.ts';
import type { TripSearchQuery } from '../schemas/tripSearchSchema.ts';
import { cairoDayBounds } from '../utils/cairoTime.ts';

export const tripSearchService = {
  async search({
    travelDate,
    originCityId,
    originStationId,
    destinationCityId,
    destinationStationId,
    limit,
    offset,
  }: TripSearchQuery) {
    const { db } = await import('../prisma/db.ts');
    const { start, end } = cairoDayBounds(travelDate);
    let query = db.orm.public.Trip.where({ status: 'SCHEDULED' })
      .where((trip) => trip.departureAt.gte(start))
      .where((trip) => trip.departureAt.lt(end))
      .where((trip) => trip.departureAt.gt(new Date().toISOString()))
      .where((trip) => trip.route.some({ isActive: true }))
      .where((trip) => trip.bus.some({ isActive: true }));
    if (originCityId)
      query = query.where((trip) =>
        trip.route.some((route) =>
          route.originStation.some({ cityId: originCityId }),
        ),
      );
    if (destinationCityId)
      query = query.where((trip) =>
        trip.route.some((route) =>
          route.destinationStation.some({ cityId: destinationCityId }),
        ),
      );
    if (originStationId)
      query = query.where((trip) => trip.route.some({ originStationId }));
    if (destinationStationId)
      query = query.where((trip) => trip.route.some({ destinationStationId }));
    const trips = await query
      .orderBy([(trip) => trip.departureAt.asc(), (trip) => trip.id.asc()])
      .limit(limit)
      .offset(offset)
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
      .all();
    return trips.map((trip) => ({
      ...trip,
      bus: trip.bus
        ? {
            id: trip.bus.id,
            seatCount: trip.bus.seatCount,
            seatLayout: trip.bus.seatLayout,
            ...busMetadata(trip.bus),
          }
        : null,
      departureAt: new Date(trip.departureAt).toISOString(),
      arrivalAt: new Date(trip.arrivalAt).toISOString(),
    }));
  },
};
export type TripSearchService = typeof tripSearchService;
