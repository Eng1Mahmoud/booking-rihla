import { z } from 'zod';
import { AppError } from '../errors/AppError.ts';
import { parsePaymobCheckoutEnv } from '../config/paymob.ts';
import {
  checkoutKey,
  decryptCheckout,
} from '../payments/checkoutEncryption.ts';
import { paymobCheckoutUrlSchema } from '../payments/checkoutUrl.ts';
import { createPaymobProvider } from '../payments/paymobProvider.ts';
import { createPaymentSessionService } from './paymentSessionService.ts';
import { withPayableBooking } from './payableBooking.ts';
import { serializeBookingPayment } from '../payments/paymentStatus.ts';
import type { AuthContext } from './sessionService.ts';
import type { db as database } from '../prisma/db.ts';

// One query loads the owner's booking and its payment evidence. GET has no
// provider dependency and never decrypts a URL or changes financial state.
function paymentRecords(db: typeof database) {
  return db.orm.public.Booking.include('refund')
    .include('trip')
    .include('paymentAttempt', (attempt) =>
      attempt.include('paymentSession', (operation) =>
        operation.include('settlement'),
      ),
    );
}
async function getPayment(userId: string, bookingId: string) {
  const { db } = await import('../prisma/db.ts');
  const row = await paymentRecords(db).where({ id: bookingId, userId }).first();
  if (!row) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  return serializeBookingPayment(row);
}

export function createPaymentCheckoutService(dependencies: {
  sessions: Pick<ReturnType<typeof createPaymentSessionService>, 'start'>;
  integrationId: number;
  ownerId: number;
  publicKey: string;
  encryptionKey: Buffer;
}) {
  const scopeId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
  const integrationId = String(scopeId.parse(dependencies.integrationId)),
    ownerId = String(scopeId.parse(dependencies.ownerId)),
    key = Buffer.from(dependencies.encryptionKey),
    publicKey = z
      .string()
      .regex(/^(?:egy_)?pk_?test_[A-Za-z0-9_-]+$/)
      .parse(dependencies.publicKey);
  if (key.length !== 32)
    throw new Error('Invalid payment checkout encryption key');
  return {
    get: getPayment,
    async start(auth: AuthContext, bookingId: string) {
      // Payment session creation persists its send-once claim before network I/O.
      await dependencies.sessions.start(auth, bookingId);
      // Recheck after the network call and before decrypting. All reads/decryption
      // here are local; no provider request is made while Trip is locked.
      return withPayableBooking(auth, bookingId, async ({ tx }) => {
        const row = await tx.orm.public.Booking.where({
          id: bookingId,
          userId: auth.user.id,
        })
          .include('paymentAttempt', (a) =>
            a.include('paymentSession', (p) => p.include('settlement')),
          )
          .first();
        const attempt = row?.paymentAttempt,
          operation = attempt?.paymentSession;
        if (!row || !attempt || !operation)
          throw new Error('Payment operation missing');
        if (
          operation.integrationId !== integrationId ||
          operation.ownerId !== ownerId
        )
          throw new AppError(
            409,
            'PAYMENT_PROVIDER_CHANGED',
            'Payment configuration changed',
          );
        if (
          attempt.amountPiastres !== row.totalPiastres ||
          attempt.currency !== 'EGP' ||
          Date.parse(attempt.expiresAt) !== Date.parse(row.expiresAt!)
        )
          throw new AppError(
            409,
            'PAYMENT_ATTEMPT_MISMATCH',
            'The payment attempt no longer matches this booking',
          );
        const data = serializeBookingPayment(row);
        if (operation.settlement || operation.reconciliationComplete)
          throw new AppError(
            409,
            'CHECKOUT_CLOSED',
            'Read this booking payment status',
          );
        let checkoutUrl: string | null = null;
        if (
          operation.status === 'READY' &&
          operation.encryptedCheckoutUrl &&
          operation.intentionId
        ) {
          const decoded = paymobCheckoutUrlSchema.parse(
            decryptCheckout(operation.id, operation.encryptedCheckoutUrl, key),
          );
          if (new URL(decoded).searchParams.get('publicKey') !== publicKey)
            throw new AppError(
              409,
              'PAYMENT_PROVIDER_CHANGED',
              'Payment configuration changed',
            );
          checkoutUrl = decoded;
        }
        return { ...data, checkoutUrl };
      });
    },
  };
}
export const paymentCheckoutService = {
  get: getPayment,
  async start(auth: AuthContext, bookingId: string) {
    const config = parsePaymobCheckoutEnv(process.env);
    if (!config)
      throw new AppError(503, 'PAYMENT_UNAVAILABLE', 'Checkout is not enabled');
    const key = checkoutKey(process.env);
    return createPaymentCheckoutService({
      sessions: createPaymentSessionService({
        provider: createPaymobProvider(config),
        integrationId: config.PAYMOB_INTEGRATION_ID,
        ownerId: config.PAYMOB_OWNER_ID,
        encryptionKey: key,
      }),
      integrationId: config.PAYMOB_INTEGRATION_ID,
      ownerId: config.PAYMOB_OWNER_ID,
      publicKey: config.PAYMOB_PUBLIC_KEY,
      encryptionKey: key,
    }).start(auth, bookingId);
  },
};
export type PaymentCheckoutService = typeof paymentCheckoutService;
