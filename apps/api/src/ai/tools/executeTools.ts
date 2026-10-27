import { Temporal } from 'temporal-polyfill';
import { cairoTimeZone } from '../../utils/cairoTime.ts';
import { tripSearchQuerySchema } from '../../schemas/tripSearchSchema.ts';
import { cityService } from '../../services/cityService.ts';
import { stationService } from '../../services/stationService.ts';
import { tripSearchService } from '../../services/tripSearchService.ts';
import { tripDetailsService } from '../../services/tripDetailsService.ts';
import {
  getCitiesInputSchema,
  getStationsInputSchema,
  searchTripsInputSchema,
  getTripDetailsInputSchema,
  getAvailableSeatsInputSchema,
  getBookingInfoInputSchema,
  type SearchTripsInput,
} from './schemas.ts';
import {
  toPublicCity,
  toPublicStation,
  toPublicTripSummary,
} from './publicDtos.ts';
import { resolveCityId, resolveStationsForCity } from './cityResolution.ts';
import { BOOKING_POLICIES } from './bookingPolicies.ts';
import { getFilters, updateFilters } from '../context/conversationState.ts';

function resolveTravelDate(input: SearchTripsInput): string {
  if (input.relativeDate) {
    const today = Temporal.Now.plainDateISO(cairoTimeZone);
    if (input.relativeDate === 'today') return today.toString();
    if (input.relativeDate === 'tomorrow')
      return today.add({ days: 1 }).toString();
    return today.add({ days: 2 }).toString();
  }
  if (input.travelDate) return input.travelDate;
  return Temporal.Now.plainDateISO(cairoTimeZone).toString();
}

type SearchEndpoint = {
  cityId?: string;
  cityName?: string;
  stationId?: string | null;
};

async function resolveEndpoint(
  input: SearchEndpoint,
  previous: SearchEndpoint,
) {
  const station = input.stationId
    ? await stationService.findById(input.stationId)
    : null;
  if (input.stationId && !station) {
    return { city: null, stationId: null, error: 'STATION_NOT_FOUND' };
  }

  let cityId = input.cityId;
  if (!cityId && !input.cityName) cityId = station?.cityId ?? previous.cityId;
  const city = await resolveCityId(cityService, {
    cityId,
    cityName: input.cityName ?? previous.cityName,
  });
  let stationId = previous.stationId ?? null;
  if (input.stationId !== undefined) stationId = input.stationId;
  else if (city?.id !== previous.cityId) stationId = null;

  if (stationId) {
    const selectedStation =
      station ?? (await stationService.findById(stationId));
    if (!selectedStation || selectedStation.cityId !== city?.id) {
      return { city, stationId: null, error: 'STATION_CITY_MISMATCH' };
    }
  }
  return { city, stationId: stationId ?? null, error: null };
}

function departureBound(date: string, time: string | null | undefined) {
  if (!time) return undefined;
  return Temporal.PlainDate.from(date)
    .toPlainDateTime(time)
    .toZonedDateTime(cairoTimeZone, { disambiguation: 'reject' })
    .toInstant()
    .toString();
}

export async function runGetCities(raw: unknown) {
  const input = getCitiesInputSchema.parse(raw);
  const cities = await cityService.list({ limit: 100, offset: 0 });
  let items = cities.map(toPublicCity);
  if (input.query) {
    const query = input.query.toLowerCase();
    items = items.filter(
      (city) =>
        city.nameAr.includes(input.query!) ||
        city.nameEn.toLowerCase().includes(query),
    );
    if (items.length === 0) {
      const city = await resolveCityId(cityService, { cityName: input.query });
      if (city) items = [toPublicCity(city)];
    }
  }
  return {
    cities: items.slice(0, input.limit),
    count: Math.min(items.length, input.limit),
    hasMore: items.length > input.limit,
  };
}

export async function runGetStations(raw: unknown) {
  const input = getStationsInputSchema.parse(raw);
  const city =
    input.cityId || input.cityName
      ? await resolveCityId(cityService, {
          cityId: input.cityId,
          cityName: input.cityName,
        })
      : null;
  if ((input.cityId || input.cityName) && !city)
    return { stations: [], error: 'CITY_NOT_FOUND' };
  let matches = city
    ? await resolveStationsForCity(stationService, city.id, input.query)
    : await stationService.list({ limit: 100, offset: 0 });
  if (!city && input.query) {
    const query = input.query.toLowerCase();
    matches = matches.filter(
      (station) =>
        station.nameAr.includes(input.query!) ||
        station.nameEn.toLowerCase().includes(query),
    );
  }
  const visible = matches.slice(0, input.limit);
  const cityIds = [...new Set(visible.map((station) => station.cityId))];
  const cities = await Promise.all(
    cityIds.map((id) => (city?.id === id ? city : cityService.findById(id))),
  );
  const cityMap = new Map(
    cities.filter((entry) => entry !== null).map((entry) => [entry.id, entry]),
  );
  return {
    stations: visible.map((station) =>
      toPublicStation(station, cityMap.get(station.cityId)),
    ),
    count: visible.length,
    hasMore: matches.length > visible.length,
  };
}

async function publicTripWithAvailability(
  trip: Parameters<typeof toPublicTripSummary>[0],
) {
  const availability = await tripDetailsService.listSeats(trip.id);
  if (!availability) return null;
  return {
    ...toPublicTripSummary(trip),
    availableSeats: availability.availableSeats,
    availabilityCheckedAt: new Date().toISOString(),
  };
}

export async function runSearchTrips(raw: unknown, conversationId?: string) {
  const input = searchTripsInputSchema.parse(raw);
  const previous = conversationId ? getFilters(conversationId) : null;
  const [origin, destination] = await Promise.all([
    resolveEndpoint(
      {
        cityId: input.originCityId,
        cityName: input.originCityName,
        stationId: input.originStationId,
      },
      {
        cityId: previous?.originCityId ?? undefined,
        cityName: previous?.originCityName ?? undefined,
        stationId: previous?.originStationId,
      },
    ),
    resolveEndpoint(
      {
        cityId: input.destinationCityId,
        cityName: input.destinationCityName,
        stationId: input.destinationStationId,
      },
      {
        cityId: previous?.destinationCityId ?? undefined,
        cityName: previous?.destinationCityName ?? undefined,
        stationId: previous?.destinationStationId,
      },
    ),
  ]);
  if (origin.error || destination.error) {
    return { trips: [], error: origin.error ?? destination.error };
  }

  const travelDate =
    input.relativeDate || input.travelDate
      ? resolveTravelDate(input)
      : (previous?.travelDate ??
        Temporal.Now.plainDateISO(cairoTimeZone).add({ days: 1 }).toString());
  const timeAfter =
    input.departureTimeAfter !== undefined
      ? input.departureTimeAfter
      : previous?.departureTimeAfter;
  const timeBefore =
    input.departureTimeBefore !== undefined
      ? input.departureTimeBefore
      : previous?.departureTimeBefore;
  const sortBy = input.sortBy ?? previous?.sortBy ?? 'departure';

  if (timeAfter && timeBefore && timeAfter >= timeBefore) {
    return {
      trips: [],
      error: 'INVALID_TIME_RANGE',
      message:
        'Ask for a departure time range within the chosen travel date, or clear a bound with null.',
    };
  }
  let departureAtOrAfter: string | undefined;
  let departureAtBefore: string | undefined;
  try {
    departureAtOrAfter = departureBound(travelDate, timeAfter);
    departureAtBefore = departureBound(travelDate, timeBefore);
  } catch {
    return {
      trips: [],
      error: 'AMBIGUOUS_OR_NONEXISTENT_TIME',
      message:
        'Ask for another departure time: this Cairo local time is ambiguous or does not exist due to daylight saving.',
    };
  }

  if (
    origin.city &&
    destination.city &&
    origin.city.id === destination.city.id
  ) {
    return {
      trips: [],
      error: 'SAME_CITY',
      message: 'Origin and destination must differ.',
    };
  }

  if (conversationId) {
    updateFilters(conversationId, {
      originCityId: origin.city?.id ?? null,
      originCityName: origin.city?.nameAr ?? null,
      destinationCityId: destination.city?.id ?? null,
      destinationCityName: destination.city?.nameAr ?? null,
      originStationId: origin.stationId,
      destinationStationId: destination.stationId,
      travelDate,
      departureTimeAfter: timeAfter ?? null,
      departureTimeBefore: timeBefore ?? null,
      sortBy,
      selectedTripId: null,
    });
  }

  if (!origin.city || !destination.city) {
    return {
      trips: [],
      error: 'MISSING_CITIES',
      message:
        'Need both origin and destination cities. Ask the user to specify or clarify them.',
      resolved: {
        origin: origin.city,
        destination: destination.city,
        travelDate,
      },
    };
  }

  const searchArgs = tripSearchQuerySchema.parse({
    travelDate,
    limit: String(input.limit),
    offset: '0',
    ...(origin.stationId
      ? { originStationId: origin.stationId }
      : { originCityId: origin.city.id }),
    ...(destination.stationId
      ? { destinationStationId: destination.stationId }
      : { destinationCityId: destination.city.id }),
  });
  const trips = await tripSearchService.search(searchArgs, {
    departureAtOrAfter,
    departureAtBefore,
    sortBy,
  });
  const summaries = await Promise.all(trips.map(publicTripWithAvailability));
  const publicTrips = summaries.filter((trip) => trip !== null);
  return {
    trips: publicTrips,
    count: publicTrips.length,
    travelDate,
    origin: origin.city,
    destination: destination.city,
    sortBy,
    search: {
      originCityId: searchArgs.originCityId,
      originStationId: searchArgs.originStationId,
      destinationCityId: searchArgs.destinationCityId,
      destinationStationId: searchArgs.destinationStationId,
      travelDate,
      departureTimeAfter: timeAfter ?? null,
      departureTimeBefore: timeBefore ?? null,
      sortBy,
    },
  };
}

export async function runGetTripDetails(raw: unknown, conversationId?: string) {
  const input = getTripDetailsInputSchema.parse(raw);
  const tripId =
    input.tripId ??
    (conversationId ? getFilters(conversationId)?.selectedTripId : undefined);
  if (!tripId)
    return { error: 'MISSING_TRIP', message: 'Ask the user to select a trip.' };
  const trip = await tripDetailsService.findById(tripId);
  if (!trip) return { error: 'TRIP_NOT_FOUND' };
  const summary = await publicTripWithAvailability(trip);
  if (!summary) return { error: 'TRIP_NOT_FOUND' };
  if (conversationId) updateFilters(conversationId, { selectedTripId: tripId });
  const amenities = trip.bus.amenities
    .map((amenity) => amenity.nameAr ?? amenity.nameEn ?? '')
    .filter(Boolean);
  const amenitiesEn = trip.bus.amenities
    .map((amenity) => amenity.nameEn ?? amenity.nameAr ?? '')
    .filter(Boolean);
  return { trip: { ...summary, amenities, amenitiesEn } };
}

export async function runGetAvailableSeats(
  raw: unknown,
  conversationId?: string,
) {
  const input = getAvailableSeatsInputSchema.parse(raw);
  const tripId =
    input.tripId ??
    (conversationId ? getFilters(conversationId)?.selectedTripId : undefined);
  if (!tripId)
    return { error: 'MISSING_TRIP', message: 'Ask the user to select a trip.' };
  const seats = await tripDetailsService.listSeats(tripId);
  if (!seats) return { error: 'TRIP_NOT_FOUND' };
  if (conversationId) updateFilters(conversationId, { selectedTripId: tripId });
  return {
    tripId: seats.tripId,
    totalSeats: seats.totalSeats,
    availableSeats: seats.availableSeats,
    tripPagePath: `/trips/${seats.tripId}`,
  };
}

export async function runGetBookingInfo(raw: unknown) {
  const input = getBookingInfoInputSchema.parse(raw);
  const topic = input.topic ?? 'general';
  const policy = BOOKING_POLICIES[topic] ?? BOOKING_POLICIES.general;
  return {
    topic,
    summaryAr: policy.summaryAr,
    summaryEn: policy.summaryEn,
  };
}
