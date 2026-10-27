import { Temporal } from 'temporal-polyfill';
import { cairoTimeZone } from '../../utils/cairoTime.ts';
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
  type PublicTripSummary,
} from './publicDtos.ts';
import { resolveCityId, resolveStationsForCity } from './cityResolution.ts';
import { BOOKING_POLICIES } from './bookingPolicies.ts';
import {
  getFilters,
  updateFilters,
  type ConversationFilters,
} from '../context/conversationState.ts';

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

function filterByTimeWindow(
  trips: PublicTripSummary[],
  after?: string,
  before?: string,
): PublicTripSummary[] {
  return trips.filter((t) => {
    const local = Temporal.Instant.from(t.departureAt)
      .toZonedDateTimeISO(cairoTimeZone)
      .toPlainTime()
      .toString({ smallestUnit: 'minute' })
      .slice(0, 5);
    if (after && local < after) return false;
    if (before && local >= before) return false;
    return true;
  });
}

export async function runGetCities(raw: unknown) {
  const input = getCitiesInputSchema.parse(raw);
  const cities = await cityService.list({ limit: 100, offset: 0 });
  let items = cities.map(toPublicCity);
  if (input.query) {
    const q = input.query.toLowerCase();
    items = items.filter(
      (c) =>
        c.nameAr.includes(input.query!) ||
        c.nameEn.toLowerCase().includes(q),
    );
  }
  return { cities: items, count: items.length };
}

export async function runGetStations(raw: unknown) {
  const input = getStationsInputSchema.parse(raw);
  let cityId = input.cityId;
  if (!cityId && input.cityName) {
    const resolved = await resolveCityId(cityService, {
      cityName: input.cityName,
    });
    if (!resolved) return { stations: [], error: 'CITY_NOT_FOUND' };
    cityId = resolved.id;
  }
  if (cityId) {
    const stations = await resolveStationsForCity(
      stationService,
      cityId,
      input.query,
    );
    return {
      stations: stations.map((s) => toPublicStation(s)),
      count: stations.length,
    };
  }
  const stations = await stationService.list({ limit: 50, offset: 0 });
  return {
    stations: stations.map((s) => toPublicStation(s)),
    count: stations.length,
  };
}

export async function runSearchTrips(
  raw: unknown,
  conversationId?: string,
) {
  const input = searchTripsInputSchema.parse(raw);
  const prev = conversationId ? getFilters(conversationId) : null;

  const origin =
    (await resolveCityId(cityService, {
      cityId: input.originCityId ?? prev?.originCityId,
      cityName: input.originCityName ?? prev?.originCityName,
    })) ?? null;
  const destination =
    (await resolveCityId(cityService, {
      cityId: input.destinationCityId ?? prev?.destinationCityId,
      cityName: input.destinationCityName ?? prev?.destinationCityName,
    })) ?? null;

  const travelDate =
    input.travelDate ||
    input.relativeDate ||
    prev?.travelDate
      ? resolveTravelDate({
          ...input,
          travelDate: input.travelDate ?? prev?.travelDate,
          relativeDate: input.relativeDate,
        })
      : Temporal.Now.plainDateISO(cairoTimeZone).add({ days: 1 }).toString();

  if (!origin || !destination) {
    return {
      trips: [],
      error: 'MISSING_CITIES',
      message:
        'Need both origin and destination cities. Ask the user to specify them.',
      resolved: { origin, destination, travelDate },
    };
  }
  if (origin.id === destination.id) {
    return {
      trips: [],
      error: 'SAME_CITY',
      message: 'Origin and destination must differ.',
    };
  }

  const originStationId =
    input.originStationId ?? prev?.originStationId;
  const destinationStationId =
    input.destinationStationId ?? prev?.destinationStationId;

  const searchArgs = {
    travelDate,
    limit: input.limit ?? 5,
    offset: 0,
    ...(originStationId
      ? { originStationId }
      : { originCityId: origin.id }),
    ...(destinationStationId
      ? { destinationStationId }
      : { destinationCityId: destination.id }),
  };

  const trips = await tripSearchService.search(searchArgs as never);
  let publicTrips = trips.map(toPublicTripSummary);

  const timeAfter =
    input.departureTimeAfter ?? prev?.departureTimeAfter;
  const timeBefore =
    input.departureTimeBefore ?? prev?.departureTimeBefore;
  publicTrips = filterByTimeWindow(publicTrips, timeAfter, timeBefore);

  const sortBy = input.sortBy ?? prev?.sortBy ?? 'departure';
  if (sortBy === 'price') {
    publicTrips = [...publicTrips].sort(
      (a, b) => a.pricePiastres - b.pricePiastres,
    );
  }

  if (conversationId) {
    const patch: Partial<ConversationFilters> = {
      originCityId: origin.id,
      originCityName: origin.nameAr,
      destinationCityId: destination.id,
      destinationCityName: destination.nameAr,
      travelDate,
      sortBy,
    };
    if (timeAfter) patch.departureTimeAfter = timeAfter;
    if (timeBefore) patch.departureTimeBefore = timeBefore;
    if (originStationId) patch.originStationId = originStationId;
    if (destinationStationId)
      patch.destinationStationId = destinationStationId;
    updateFilters(conversationId, patch);
  }

  return {
    trips: publicTrips,
    count: publicTrips.length,
    travelDate,
    origin: { id: origin.id, nameAr: origin.nameAr, nameEn: origin.nameEn },
    destination: {
      id: destination.id,
      nameAr: destination.nameAr,
      nameEn: destination.nameEn,
    },
    sortBy,
  };
}

export async function runGetTripDetails(
  raw: unknown,
  conversationId?: string,
) {
  const input = getTripDetailsInputSchema.parse(raw);
  const trip = await tripDetailsService.findById(input.tripId);
  if (!trip) return { error: 'TRIP_NOT_FOUND' };
  if (conversationId) {
    updateFilters(conversationId, { selectedTripId: input.tripId });
  }
  const summary = toPublicTripSummary(trip as never);
  const amenities =
    (trip as { bus?: { amenities?: { nameAr?: string; nameEn?: string }[] } })
      .bus?.amenities?.map((a) => a.nameAr ?? a.nameEn ?? '')
      .filter(Boolean) ?? [];
  return { trip: { ...summary, amenities } };
}

export async function runGetAvailableSeats(raw: unknown) {
  const input = getAvailableSeatsInputSchema.parse(raw);
  const seats = await tripDetailsService.listSeats(input.tripId);
  if (!seats) return { error: 'TRIP_NOT_FOUND' };
  const list = seats as {
    totalSeats: number;
    availableSeats: number;
    tripId: string;
  };
  return {
    tripId: list.tripId,
    totalSeats: list.totalSeats,
    availableSeats: list.availableSeats,
    tripPagePath: `/trips/${list.tripId}`,
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
