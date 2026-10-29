import type { BookingPaymentData } from '../types/booking';

/** Seconds left on the seat hold, adjusted for client clock drift from dataUpdatedAt. */
export function remainingHoldSeconds(
  payment: Pick<BookingPaymentData, 'expiresAt' | 'serverTime'>,
  now: number,
  dataUpdatedAt: number,
) {
  if (!payment.expiresAt) return 0;
  return Math.max(
    0,
    Math.floor(
      (Date.parse(payment.expiresAt) -
        Date.parse(payment.serverTime) -
        Math.max(0, now - dataUpdatedAt)) /
        1000,
    ),
  );
}
