import { AppError } from '../errors/AppError.ts';
import { parseAndVerifyTicketQr } from '../utils/ticketQr.ts';
import { ticketRecords, serializeTicketDetails } from './ticketService.ts';
import { lockBookingTrip } from './bookingHoldService.ts';

export type ScanAction = 'verify' | 'board';

function inBoardingWindow(departureAt: string, now: number): boolean {
  const configuredBefore = Number(
    process.env.TICKET_BOARDING_HOURS_BEFORE ?? '4',
  );
  const configuredAfter = Number(
    process.env.TICKET_BOARDING_HOURS_AFTER ?? '2',
  );
  const before =
    Number.isFinite(configuredBefore) && configuredBefore > 0
      ? configuredBefore
      : 4;
  const after =
    Number.isFinite(configuredAfter) && configuredAfter >= 0
      ? configuredAfter
      : 2;
  const departure = Date.parse(departureAt);
  return (
    Number.isFinite(departure) &&
    now >= departure - before * 3600_000 &&
    now <= departure + after * 3600_000
  );
}

export type TicketScanResult = {
  code:
    | 'OK'
    | 'ALREADY_BOARDED'
    | 'OUTSIDE_WINDOW'
    | 'NOT_ELIGIBLE'
    | 'NOT_FOUND'
    | 'INVALID_QR';
  action: ScanAction;
  boardedAt: string | null;
  ticket: {
    id: string;
    bookingId: string;
    reference: string;
    passenger: { seatId: string; name: string; seatNumber: string | number };
    trip: {
      id: string;
      departureAt: string;
      arrivalAt: string;
      origin: string;
      destination: string;
    };
    totalPiastres: number;
  } | null;
};

export const ticketScanService = {
  async scan(input: {
    payload: string;
    action: ScanAction;
    staffUserId: string;
    language?: string;
  }): Promise<TicketScanResult> {
    const outcome = (
      code: TicketScanResult['code'],
      ticket: TicketScanResult['ticket'] = null,
      boardedAt: string | null = null,
    ): TicketScanResult => ({ code, action: input.action, ticket, boardedAt });
    const verified = parseAndVerifyTicketQr(input.payload);
    if (!verified.ok) return outcome('INVALID_QR');

    const { db } = await import('../prisma/db.ts');
    const initial = await db.orm.public.Booking.where({
      id: verified.claims.bookingId,
    })
      .select('id', 'tripId')
      .first();
    if (!initial) return outcome('NOT_FOUND');

    return db.transaction(async (tx) => {
      // Cancellation and seat release use this same lock. Re-read eligibility
      // after acquiring it, so concurrent scans/cancellation cannot use stale data.
      await lockBookingTrip(tx, db, initial.tripId);
      const booking = await ticketRecords(tx).where({ id: initial.id }).first();
      if (!booking?.ticket || booking.ticket.id !== verified.claims.ticketId)
        return outcome('NOT_FOUND');
      const seat = booking.seats.find(
        (candidate) => candidate.id === verified.claims.seatId,
      );
      if (!seat || seat.releasedAt) return outcome('NOT_FOUND');
      const details = serializeTicketDetails(booking);
      if (!details) return outcome('NOT_ELIGIBLE');

      const station = (value: typeof details.trip.origin) =>
        input.language === 'en'
          ? `${value.cityEn} - ${value.nameEn}`
          : `${value.cityAr} - ${value.nameAr}`;
      const ticket = {
        id: details.id,
        bookingId: details.bookingId,
        reference: details.reference,
        passenger: {
          seatId: seat.id,
          name: seat.passengerName,
          seatNumber: seat.seatNumber,
        },
        trip: {
          id: details.trip.id,
          departureAt: details.trip.departureAt,
          arrivalAt: details.trip.arrivalAt,
          origin: station(details.trip.origin),
          destination: station(details.trip.destination),
        },
        totalPiastres: details.totalPiastres,
      };
      const now = Date.now();
      if (seat.boardedAt)
        return outcome(
          'ALREADY_BOARDED',
          ticket,
          new Date(seat.boardedAt).toISOString(),
        );
      if (!inBoardingWindow(details.trip.departureAt, now))
        return outcome('OUTSIDE_WINDOW', ticket);
      if (input.action === 'verify') return outcome('OK', ticket);

      const recorded = await tx.orm.public.BookingSeat.where({
        id: seat.id,
        boardedAt: null,
        releasedAt: null,
      }).update({
        boardedAt: new Date(now).toISOString(),
        boardedByUserId: input.staffUserId,
      });
      if (!recorded?.boardedAt)
        throw new AppError(409, 'CONFLICT', 'Seat boarding was not recorded');
      return outcome('OK', ticket, new Date(recorded.boardedAt).toISOString());
    });
  },
};

export type TicketScanService = typeof ticketScanService;
