import { bookingState } from '../services/bookingHoldService.ts';
// Minimal shared input: neither operator reads nor status serialization need a
// checkout secret, raw event, customer credentials or provider network request.
type PaymentStatusInput = {
  refund?: { status: string; amountPiastres: bigint } | null;
  trip?: { status: string } | null;
  id: string;
  status: Parameters<typeof bookingState>[0]['status'];
  totalPiastres: bigint;
  expiresAt: string | null;
  paymentAttempt: {
    amountPiastres: bigint;
    currency: string;
    expiresAt: string;
    authorization: {
      status: string;
      reconciliationComplete: boolean;
      settlement: {
        status: string;
        kind: string;
        amountPiastres: bigint;
      } | null;
    } | null;
  } | null;
};
type PaymentStatus =
  | 'NOT_STARTED'
  | 'PREPARED'
  | 'INITIALIZING'
  | 'AWAITING_PAYMENT'
  | 'UNKNOWN'
  | 'PROCESSING'
  | 'PAID'
  | 'REFUNDED'
  | 'VOIDED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REVIEW';
export function serializeBookingPayment(row: PaymentStatusInput) {
  const now = Date.now(),
    state = bookingState(row, now),
    attempt = row.paymentAttempt,
    operation = attempt?.authorization,
    settlement = operation?.settlement;
  const matches =
    attempt &&
    attempt.currency === 'EGP' &&
    attempt.amountPiastres === row.totalPiastres &&
    row.expiresAt &&
    Date.parse(attempt.expiresAt) === Date.parse(row.expiresAt);
  let paymentStatus: PaymentStatus;
  if (settlement?.status === 'REVIEW') paymentStatus = 'REVIEW';
  else if (attempt && !matches) paymentStatus = 'UNKNOWN';
  else if (settlement?.kind === 'CAPTURE' && settlement.status === 'SUCCEEDED')
    paymentStatus =
      state === 'CONFIRMED' &&
      operation?.reconciliationComplete &&
      settlement.amountPiastres === row.totalPiastres
        ? 'PAID'
        : 'UNKNOWN';
  else if (state === 'CONFIRMED') paymentStatus = 'UNKNOWN';
  else if (settlement?.kind === 'VOID' && settlement.status === 'SUCCEEDED')
    paymentStatus = state === 'EXPIRED' ? 'VOIDED' : 'UNKNOWN';
  else if (settlement || state === 'PAYMENT_PROCESSING')
    paymentStatus = 'PROCESSING';
  else if (operation?.status === 'REQUESTING') paymentStatus = 'INITIALIZING';
  else if (operation?.status === 'UNKNOWN') paymentStatus = 'UNKNOWN';
  else if (state === 'EXPIRED' || operation?.status === 'EXPIRED')
    paymentStatus = 'EXPIRED';
  else if (operation?.status === 'FAILED') paymentStatus = 'FAILED';
  else if (operation?.status === 'READY') paymentStatus = 'AWAITING_PAYMENT';
  else paymentStatus = attempt ? 'PREPARED' : 'NOT_STARTED';
  return {
    bookingId: row.id,
    bookingStatus: row.trip?.status === 'CANCELLED' ? 'CANCELLED' : state,
    paymentStatus:
      row.refund?.status === 'SUCCEEDED' &&
      row.refund.amountPiastres === row.totalPiastres &&
      paymentStatus === 'PAID'
        ? 'REFUNDED'
        : paymentStatus,
    refundStatus: row.refund?.status ?? null,
    amountPiastres: Number(row.totalPiastres),
    currency: 'EGP' as const,
    expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
    serverTime: new Date(now).toISOString(),
  };
}
