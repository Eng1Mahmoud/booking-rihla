import type { BookingPayment } from './types';
export function isPaymentPending(status: string) {
  return ['INITIALIZING', 'AWAITING_PAYMENT', 'UNKNOWN', 'PROCESSING'].includes(
    status,
  );
}
export function paymentOutcome(payment: BookingPayment) {
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
    payment.bookingStatus === 'EXPIRED'
  )
    return 'expired';
  return 'waiting';
}
