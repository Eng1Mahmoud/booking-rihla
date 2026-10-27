import QRCode from 'qrcode';
import { createTicketQrPayload } from '../utils/ticketQr.ts';
import { bookingRecords } from './bookingService.ts';
import { serializeBookingPayment } from '../payments/paymentStatus.ts';
import type { db as database } from '../prisma/db.ts';

export function ticketRecords(db: Pick<typeof database, 'orm'>) {
  return bookingRecords(db)
    .include('ticket')
    .include('seats', (seats) => seats.orderBy((seat) => seat.seatNumber.asc()))
    .include('paymentAttempt', (attempt) =>
      attempt.include('paymentSession', (session) =>
        session.include('settlement'),
      ),
    );
}
type TicketBooking = NonNullable<
  Awaited<ReturnType<ReturnType<typeof ticketRecords>['first']>>
>;
export function serializeTicketDetails(booking: TicketBooking) {
  const ticket = booking.ticket;
  if (
    !ticket ||
    !booking.trip?.route ||
    booking.trip.status !== 'SCHEDULED' ||
    booking.status !== 'CONFIRMED' ||
    serializeBookingPayment(booking).paymentStatus !== 'PAID' ||
    booking.seats.length !== booking.seatCount ||
    booking.seats.some((seat) => seat.releasedAt)
  )
    return null;
  const route = booking.trip.route;
  const origin = route.originStation,
    destination = route.destinationStation;
  if (!origin?.city || !destination?.city)
    throw new Error('Ticket route is missing');
  return {
    id: ticket.id,
    bookingId: booking.id,
    reference: booking.reference,
    issuedAt: new Date(ticket.createdAt).toISOString(),
    currency: 'EGP',
    totalPiastres: Number(booking.totalPiastres),
    passengers: booking.seats.map((seat) => ({
      seatId: seat.id,
      name: seat.passengerName,
      seatNumber: seat.seatNumber,
    })),
    trip: {
      id: booking.trip.id,
      departureAt: new Date(booking.trip.departureAt).toISOString(),
      arrivalAt: new Date(booking.trip.arrivalAt).toISOString(),
      origin: {
        nameAr: origin.nameAr,
        nameEn: origin.nameEn,
        cityAr: origin.city.nameAr,
        cityEn: origin.city.nameEn,
      },
      destination: {
        nameAr: destination.nameAr,
        nameEn: destination.nameEn,
        cityAr: destination.city.nameAr,
        cityEn: destination.city.nameEn,
      },
    },
  };
}
export type TicketDetails = NonNullable<
  ReturnType<typeof serializeTicketDetails>
>;

async function qrImage(payload: string) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
  });
}

export async function serializeTicket(booking: TicketBooking) {
  const details = serializeTicketDetails(booking);
  if (!details) return null;

  const passengers = await Promise.all(
    details.passengers.map(async (passenger) => {
      const payload = createTicketQrPayload({
        ticketId: details.id,
        bookingId: details.bookingId,
        seatId: passenger.seatId,
        issuedAt: details.issuedAt,
      });
      return {
        ...passenger,
        qr: {
          payload,
          imageDataUrl: await qrImage(payload),
        },
      };
    }),
  );

  // Primary QR kept for older clients: first passenger seat.
  const primary = passengers[0]?.qr;
  if (!primary) return null;

  return {
    ...details,
    passengers,
    qr: primary,
  };
}
export type TicketData = NonNullable<
  Awaited<ReturnType<typeof serializeTicket>>
>;
export const ticketService = {
  async findByBooking(userId: string, bookingId: string) {
    const { db } = await import('../prisma/db.ts');
    const booking = await ticketRecords(db)
      .where({ id: bookingId, userId })
      .first();
    return booking ? serializeTicket(booking) : null;
  },
};
export type TicketService = typeof ticketService;
