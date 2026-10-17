import { recordAudit, type AuditActor } from './auditWriter.ts';
import { AppError } from '../errors/AppError.ts';
import type { Trip } from './tripService.ts';
import type { BatchDeparture } from '../utils/tripBatchDates.ts';
import type { TripBatchInput } from '../schemas/tripBatchSchema.ts';
import { buildBatchDepartures } from '../utils/tripBatchDates.ts';
import { cairoTimeZone } from '../utils/cairoTime.ts';
import {
  intervalsOverlap,
  lockTripParents,
  scheduledTripsInInterval,
} from './tripScheduling.ts';

type Conflict =
  | { type: 'EXISTING_TRIP'; tripId: string }
  | { type: 'BATCH_TRIP'; date: string };
type BatchPreview = {
  timeZone: string;
  canCreate: boolean;
  totalTrips: number;
  trips: (BatchDeparture & { conflicts: Conflict[] })[];
};
type BatchCreated = { timeZone: string; totalTrips: number; trips: Trip[] };
function processBatch(
  input: TripBatchInput,
  save: false,
  actor?: AuditActor,
): Promise<BatchPreview>;
function processBatch(
  input: TripBatchInput,
  save: true,
  actor?: AuditActor,
): Promise<BatchCreated>;
async function processBatch(
  input: TripBatchInput,
  save: boolean,
  actor?: AuditActor,
): Promise<BatchPreview | BatchCreated> {
  const departures = buildBatchDepartures(input);
  const { db } = await import('../prisma/db.ts');
  return await db.transaction(async (tx) => {
    await lockTripParents(tx, db, input);
    // Recheck the clock after waiting for the scheduling lock.
    if (Date.parse(departures[0]!.departureAt) <= Date.now())
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Every departure must be in the future',
      );
    const existing = await scheduledTripsInInterval(tx, {
      busId: input.busId,
      departureAt: departures[0]!.departureAt,
      arrivalAt: departures[departures.length - 1]!.arrivalAt,
    })
      .orderBy([(trip) => trip.departureAt.asc(), (trip) => trip.id.asc()])
      .all();
    const trips = departures.map((departure) => {
      const conflicts: Conflict[] = [
        ...existing
          .filter((trip) => intervalsOverlap(departure, trip))
          .map((trip) => ({ type: 'EXISTING_TRIP' as const, tripId: trip.id })),
        ...departures
          .filter(
            (other) =>
              other !== departure && intervalsOverlap(departure, other),
          )
          .map((other) => ({ type: 'BATCH_TRIP' as const, date: other.date })),
      ];
      return { ...departure, conflicts };
    });
    const canCreate = trips.every((trip) => trip.conflicts.length === 0);
    if (!save)
      return {
        timeZone: cairoTimeZone,
        canCreate,
        totalTrips: trips.length,
        trips,
      };
    if (!canCreate)
      throw new AppError(
        409,
        'BUS_SCHEDULE_CONFLICT',
        'No trips were created; refresh the batch preview and resolve bus schedule conflicts',
      );
    const created: Trip[] = [];
    for (const departure of departures) {
      const { routeId, busId, departureAt, arrivalAt, pricePiastres, status } =
        departure;
      created.push(
        await tx.orm.public.Trip.create({
          routeId,
          busId,
          departureAt,
          arrivalAt,
          pricePiastres,
          status,
        }),
      );
    }
    for (const trip of created)
      await recordAudit(tx, actor, 'Trip', trip.id, null, trip);
    return {
      timeZone: cairoTimeZone,
      totalTrips: created.length,
      trips: created.map((trip) => ({
        ...trip,
        departureAt: new Date(trip.departureAt).toISOString(),
        arrivalAt: new Date(trip.arrivalAt).toISOString(),
      })),
    };
  });
}
export const tripBatchService = {
  async preview(input: TripBatchInput) {
    return await processBatch(input, false);
  },
  async create(input: TripBatchInput, actor?: AuditActor) {
    return await processBatch(input, true, actor);
  },
};
export type TripBatchService = typeof tripBatchService;
