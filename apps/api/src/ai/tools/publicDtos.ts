/**
 * Explicit public fields allowed in tool results.
 * Never pass Prisma rows or private fields to the model.
 */

export type PublicCity = {
  id: string;
  nameAr: string;
  nameEn: string;
};

export type PublicStation = {
  id: string;
  nameAr: string;
  nameEn: string;
  cityId: string;
  cityNameAr?: string;
  cityNameEn?: string;
};

export type PublicTripSummary = {
  id: string;
  departureAt: string;
  arrivalAt: string;
  pricePiastres: number;
  priceEgp: number;
  originCity: string;
  originStation: string;
  destinationCity: string;
  destinationStation: string;
  busType: string | null;
  seatCount: number;
  tripPagePath: string;
};

export type PublicTripDetails = PublicTripSummary & {
  amenities: string[];
};

export type PublicSeatAvailability = {
  tripId: string;
  totalSeats: number;
  availableSeats: number;
  tripPagePath: string;
};

export type PublicBookingInfo = {
  topic: string;
  summaryAr: string;
  summaryEn: string;
};

export function toPublicCity(c: {
  id: string;
  nameAr: string;
  nameEn: string;
}): PublicCity {
  return { id: c.id, nameAr: c.nameAr, nameEn: c.nameEn };
}

export function toPublicStation(
  s: { id: string; nameAr: string; nameEn: string; cityId: string },
  city?: { nameAr: string; nameEn: string } | null,
): PublicStation {
  return {
    id: s.id,
    nameAr: s.nameAr,
    nameEn: s.nameEn,
    cityId: s.cityId,
    cityNameAr: city?.nameAr,
    cityNameEn: city?.nameEn,
  };
}

export function piastresToEgp(piastres: number): number {
  return Math.round(piastres) / 100;
}

export function toPublicTripSummary(trip: {
  id: string;
  departureAt: string;
  arrivalAt: string;
  pricePiastres: number;
  route?: {
    originStation?: {
      nameAr?: string;
      nameEn?: string;
      city?: { nameAr?: string; nameEn?: string };
    };
    destinationStation?: {
      nameAr?: string;
      nameEn?: string;
      city?: { nameAr?: string; nameEn?: string };
    };
  };
  bus?: {
    seatCount?: number;
    busType?: { nameAr?: string; nameEn?: string; code?: string } | null;
  } | null;
}): PublicTripSummary {
  const origin = trip.route?.originStation;
  const dest = trip.route?.destinationStation;
  return {
    id: trip.id,
    departureAt: trip.departureAt,
    arrivalAt: trip.arrivalAt,
    pricePiastres: trip.pricePiastres,
    priceEgp: piastresToEgp(trip.pricePiastres),
    originCity: origin?.city?.nameAr ?? origin?.city?.nameEn ?? '',
    originStation: origin?.nameAr ?? origin?.nameEn ?? '',
    destinationCity: dest?.city?.nameAr ?? dest?.city?.nameEn ?? '',
    destinationStation: dest?.nameAr ?? dest?.nameEn ?? '',
    busType: trip.bus?.busType?.nameAr ?? trip.bus?.busType?.nameEn ?? null,
    seatCount: trip.bus?.seatCount ?? 0,
    tripPagePath: `/trips/${trip.id}`,
  };
}
