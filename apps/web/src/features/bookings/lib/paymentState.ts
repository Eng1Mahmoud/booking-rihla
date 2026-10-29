import type { BookingPaymentData } from '../types/booking';

export function isPaymentPending(status: string) {
  return ['INITIALIZING', 'AWAITING_PAYMENT', 'UNKNOWN', 'PROCESSING'].includes(
    status,
  );
}

/** True when the temporary seat hold has ended on the server clock. */
export function isHoldExpired(payment: BookingPaymentData) {
  if (!payment.expiresAt) return false;
  return Date.parse(payment.expiresAt) <= Date.parse(payment.serverTime);
}

export function paymentOutcome(payment: BookingPaymentData) {
  if (payment.bookingStatus === 'CANCELLED') return 'cancelled';
  if (payment.paymentStatus === 'REFUNDED') return 'refunded';
  if (payment.paymentStatus === 'REFUND_REQUIRED') return 'refundRequired';
  if (payment.paymentStatus === 'REVIEW') return 'review';
  if (payment.paymentStatus === 'PAID' && payment.bookingStatus === 'CONFIRMED')
    return 'paid';
  if (
    ['UNKNOWN', 'INITIALIZING', 'PROCESSING'].includes(payment.paymentStatus) ||
    payment.bookingStatus === 'PAYMENT_PROCESSING'
  )
    return 'processing';
  if (payment.paymentStatus === 'FAILED') return 'failed';
  if (
    payment.paymentStatus === 'EXPIRED' ||
    payment.bookingStatus === 'EXPIRED' ||
    (isHoldExpired(payment) &&
      ['NOT_STARTED', 'PREPARED', 'AWAITING_PAYMENT'].includes(
        payment.paymentStatus,
      ))
  )
    return 'expired';
  return 'waiting';
}
