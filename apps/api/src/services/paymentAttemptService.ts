import { AppError } from '../errors/AppError.ts';
import { withPayableBooking } from './payableBooking.ts';
import type { AuthContext } from './sessionService.ts';
import type { db as database } from '../prisma/db.ts';

type Attempt = NonNullable<
  Awaited<ReturnType<typeof database.orm.public.PaymentAttempt.first>>
>;
function serialize(attempt: Attempt) {
  return {
    id: attempt.id,
    bookingId: attempt.bookingId,
    status:
      Date.parse(attempt.expiresAt) <= Date.now()
        ? ('EXPIRED' as const)
        : ('PREPARED' as const),
    amountPiastres: Number(attempt.amountPiastres),
    currency: attempt.currency,
    expiresAt: new Date(attempt.expiresAt).toISOString(),
    createdAt: new Date(attempt.createdAt).toISOString(),
  };
}
const missingBooking = () =>
  new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
export const paymentAttemptService = {
  async prepare(auth: AuthContext, bookingId: string, idempotencyKey: string) {
    const result = await withPayableBooking(
      auth,
      bookingId,
      async ({ tx, booking }) => {
        const existing = await tx.orm.public.PaymentAttempt.where({
          bookingId,
        }).first();
        if (existing) {
          if (existing.idempotencyKey !== idempotencyKey)
            throw new AppError(
              409,
              'PAYMENT_ATTEMPT_EXISTS',
              'Use the original idempotency key or retrieve the existing payment attempt',
            );
          if (
            existing.amountPiastres !== booking.totalPiastres ||
            Date.parse(existing.expiresAt) !== Date.parse(booking.expiresAt)
          )
            throw new AppError(
              409,
              'PAYMENT_ATTEMPT_MISMATCH',
              'The payment attempt no longer matches this booking',
            );
          return { attempt: existing, created: false };
        }
        const attempt = await tx.orm.public.PaymentAttempt.create({
          bookingId,
          idempotencyKey,
          amountPiastres: booking.totalPiastres,
          currency: 'EGP',
          expiresAt: booking.expiresAt,
        });
        return { attempt, created: true };
      },
    );
    return { data: serialize(result.attempt), created: result.created };
  },
  async findByBooking(userId: string, bookingId: string) {
    const { db } = await import('../prisma/db.ts');
    const booking = await db.orm.public.Booking.where({
      id: bookingId,
      userId,
    }).first();
    if (!booking) throw missingBooking();
    const attempt = await db.orm.public.PaymentAttempt.where({
      bookingId,
    }).first();
    return attempt ? serialize(attempt) : null;
  },
};
export type PaymentAttemptService = typeof paymentAttemptService;
