import { Temporal } from 'temporal-polyfill';
import { AppError } from '../errors/AppError.ts';
import { cairoTimeZone } from './cairoTime.ts';
import type { TripBatchInput } from '../schemas/tripBatchSchema.ts';
import type { CreateTripInput } from '../schemas/tripSchema.ts';

export type BatchDeparture = CreateTripInput & { date: string };
export function buildBatchDepartures(
  input: TripBatchInput,
  now = Date.now(),
): BatchDeparture[] {
  const trips: BatchDeparture[] = [];
  const end = Temporal.PlainDate.from(input.endDate);
  for (
    let day = Temporal.PlainDate.from(input.startDate);
    Temporal.PlainDate.compare(day, end) <= 0;
    day = day.add({ days: 1 })
  ) {
    if (!input.weekdays.includes(day.dayOfWeek)) continue;
    let departure;
    try {
      // Refuse a skipped or repeated local time instead of silently moving it at DST changes.
      departure = day
        .toPlainDateTime(input.departureTime)
        .toZonedDateTime(cairoTimeZone, { disambiguation: 'reject' })
        .toInstant();
    } catch {
      throw new AppError(
        400,
        'INVALID_DEPARTURE_TIME',
        'Choose an unambiguous Cairo departure time on ' + day.toString(),
      );
    }
    if (departure.epochMilliseconds <= now)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Every departure must be in the future',
      );
    trips.push({
      date: day.toString(),
      routeId: input.routeId,
      busId: input.busId,
      departureAt: new Date(departure.epochMilliseconds).toISOString(),
      arrivalAt: new Date(
        departure.add({ minutes: input.durationMinutes }).epochMilliseconds,
      ).toISOString(),
      pricePiastres: input.pricePiastres,
      status: 'SCHEDULED',
    });
  }
  if (!trips.length)
    throw new AppError(
      400,
      'NO_DEPARTURES',
      'The date range contains none of the chosen weekdays',
    );
  return trips;
}
