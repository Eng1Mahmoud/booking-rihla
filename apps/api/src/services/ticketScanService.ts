import { AppError } from '../errors/AppError.ts';
import { parseAndVerifyTicketQr } from '../utils/ticketQr.ts';
import { ticketRecords, serializeTicketDetails } from './ticketService.ts';
import { serializeBookingPayment } from '../payments/paymentStatus.ts';

export type ScanAction = 'verify' | 'board';

function boardingWindowHours(): { before: number; after: number } {
  const before = Number(process.env.TICKET_BOARDING_HOURS_BEFORE ?? '4');
  const after = Number(process.env.TICKET_BOARDING_HOURS_AFTER ?? '2');
  return {
    before: Number.isFinite(before) && before > 0 ? before : 4,
    after: Number.isFinite(after) && after >= 0 ? after : 2,
  };
}

function inBoardingWindow(departureAt: string, now = Date.now()): boolean {
  const dep = Date.parse(departureAt);
  if (!Number.isFinite(dep)) return false;
  const { before, after } = boardingWindowHours();
  return now >= dep - before * 3600_000 && now <= dep + after * 3600_000;
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

async function readSeatBoarding(seatId: string): Promise<string | null> {
  const { db } = await import('../prisma/db.ts');
  try {
    const rows = await db.raw.sql<{ boardedAt: string | null }[]>`
      SELECT "boardedAt" FROM "public"."BookingSeat" WHERE "id" = ${seatId} LIMIT 1`;
    const value = rows[0]?.boardedAt;
    return value ? new Date(value).toISOString() : null;
  } catch {
    return null;
  }
}

async function markSeatBoarded(
  seatId: string,
  staffUserId: string,
): Promise<string> {
  const { db } = await import('../prisma/db.ts');
  const now = new Date().toISOString();
  try {
    const rows = await db.raw.sql<{ boardedAt: string | null }[]>`
      UPDATE "public"."BookingSeat"
      SET "boardedAt" = COALESCE("boardedAt", ${now}::timestamptz),
          "boardedByUserId" = COALESCE("boardedByUserId", ${staffUserId})
      WHERE "id" = ${seatId}
      RETURNING "boardedAt"`;
    const value = rows[0]?.boardedAt;
    return value ? new Date(value).toISOString() : now;
  } catch {
    throw new AppError(
      503,
      'SERVICE_UNAVAILABLE',
      'Boarding columns are not installed. Apply apps/api/sql/add_ticket_boarding.sql',
    );
  }
}

function stationLabel(
  language: 'ar' | 'en',
  station: {
    nameAr: string;
    nameEn: string;
    cityAr: string;
    cityEn: string;
  },
) {
  return language === 'ar'
    ? `${station.cityAr} - ${station.nameAr}`
    : `${station.cityEn} - ${station.nameEn}`;
}

export const ticketScanService = {
  async scan(input: {
    payload: string;
    action: ScanAction;
    staffUserId: string;
    language?: string;
  }): Promise<TicketScanResult> {
    const verified = parseAndVerifyTicketQr(input.payload);
    if (!verified.ok) {
      return {
        code: 'INVALID_QR',
        action: input.action,
        boardedAt: null,
        ticket: null,
      };
    }

    const { db } = await import('../prisma/db.ts');
    const booking = await ticketRecords(db)
      .where({ id: verified.claims.bookingId })
      .first();

    if (!booking?.ticket || booking.ticket.id !== verified.claims.ticketId) {
      return {
        code: 'NOT_FOUND',
        action: input.action,
        boardedAt: null,
        ticket: null,
      };
    }

    const seat = booking.seats.find((s) => s.id === verified.claims.seatId);
    if (!seat || seat.releasedAt) {
      return {
        code: 'NOT_FOUND',
        action: input.action,
        boardedAt: null,
        ticket: null,
      };
    }

    const details = serializeTicketDetails(booking);
    const payment = serializeBookingPayment(booking);
    if (
      !details ||
      booking.status !== 'CONFIRMED' ||
      payment.paymentStatus !== 'PAID' ||
      booking.trip?.status !== 'SCHEDULED'
    ) {
      return {
        code: 'NOT_ELIGIBLE',
        action: input.action,
        boardedAt: null,
        ticket: null,
      };
    }

    const language = input.language === 'en' ? 'en' : 'ar';
    const ticketView = {
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
        origin: stationLabel(language, details.trip.origin),
        destination: stationLabel(language, details.trip.destination),
      },
      totalPiastres: details.totalPiastres,
    };

    if (!inBoardingWindow(details.trip.departureAt)) {
      return {
        code: 'OUTSIDE_WINDOW',
        action: input.action,
        boardedAt: await readSeatBoarding(seat.id),
        ticket: ticketView,
      };
    }

    const existingBoard = await readSeatBoarding(seat.id);
    if (existingBoard) {
      return {
        code: 'ALREADY_BOARDED',
        action: input.action,
        boardedAt: existingBoard,
        ticket: ticketView,
      };
    }

    if (input.action === 'board') {
      const boardedAt = await markSeatBoarded(seat.id, input.staffUserId);
      return {
        code: 'OK',
        action: 'board',
        boardedAt,
        ticket: ticketView,
      };
    }

    return {
      code: 'OK',
      action: 'verify',
      boardedAt: null,
      ticket: ticketView,
    };
  },
};

export type TicketScanService = typeof ticketScanService;
