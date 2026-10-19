import { paymobCheckoutUrlSchema } from '../payments/checkoutUrl.ts';
import { z } from 'zod';
import { AppError } from '../errors/AppError.ts';
import { paymobMinimumCheckoutSeconds } from '../config/paymob.ts';
import { encryptCheckout } from '../payments/checkoutEncryption.ts';
import {
  PaymentProviderError,
  type PaymentProvider,
} from '../payments/paymentProvider.ts';
import type { AuthContext } from './sessionService.ts';
import { withPayableBooking } from './payableBooking.ts';
import type { db as database } from '../prisma/db.ts';
type Operation = NonNullable<
  Awaited<ReturnType<typeof database.orm.public.PaymentSession.first>>
>;
function summary(row: Operation | null) {
  if (!row)
    throw new Error('Payment operation state changed; reconciliation required');
  // No checkout URL/secret/customer data leaves this internal preparation service.
  return {
    id: row.id,
    paymentAttemptId: row.paymentAttemptId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
const scopeId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const resultSchema = z.object({
  intentionId: z.string().regex(/^pi_test_[A-Za-z0-9_-]+$/),
  orderId: z
    .string()
    .regex(/^[1-9][0-9]*$/)
    .refine((v) => Number.isSafeInteger(Number(v))),
  checkoutUrl: paymobCheckoutUrlSchema,
});
// Durable creation only: the owner-scoped checkout service controls link exposure.
// This service returns operation metadata only, never a usable checkout link.
export function createPaymentSessionService(dependencies: {
  provider: Pick<PaymentProvider, 'createPayment'>;
  integrationId: number;
  ownerId: number;
  encryptionKey: Buffer;
}) {
  const integrationId = String(scopeId.parse(dependencies.integrationId)),
    ownerId = String(scopeId.parse(dependencies.ownerId));
  const key = Buffer.from(dependencies.encryptionKey);
  if (key.length !== 32)
    throw new Error('Invalid payment checkout encryption key');
  return {
    async start(auth: AuthContext, bookingId: string) {
      const { db } = await import('../prisma/db.ts');
      const claim = await withPayableBooking(
        auth,
        bookingId,
        async ({ tx, booking, user }) => {
          const attempt = await tx.orm.public.PaymentAttempt.where({
            bookingId,
          }).first();
          if (!attempt)
            throw new AppError(
              409,
              'PAYMENT_ATTEMPT_REQUIRED',
              'Prepare this booking payment first',
            );
          if (
            attempt.amountPiastres !== booking.totalPiastres ||
            attempt.currency !== 'EGP' ||
            Date.parse(attempt.expiresAt) !== Date.parse(booking.expiresAt!)
          )
            throw new AppError(
              409,
              'PAYMENT_ATTEMPT_MISMATCH',
              'The payment attempt no longer matches this booking',
            );
          const previous = await tx.orm.public.PaymentSession.where({
            paymentAttemptId: attempt.id,
          }).first();
          if (previous) {
            if (
              previous.integrationId !== integrationId ||
              previous.ownerId !== ownerId
            )
              throw new AppError(
                409,
                'PAYMENT_PROVIDER_CHANGED',
                'Payment configuration changed; reconcile the existing operation',
              );
            return { operation: previous, input: null };
          }
          if (
            Date.parse(booking.expiresAt) - Date.now() <
            paymobMinimumCheckoutSeconds * 1000
          )
            throw new AppError(
              409,
              'PAYMENT_WINDOW_TOO_SHORT',
              'At least one minute must remain to create a new checkout',
            );
          const names = user.name.trim().split(/\s+/);
          const customer = {
            firstName: names[0]!,
            lastName: names.slice(1).join(' ') || names[0]!,
            email: user.email,
            phone: booking.contactPhone,
          };
          if (
            !z
              .object({
                firstName: z.string().min(1).max(100),
                lastName: z.string().min(1).max(100),
                email: z.email(),
                phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
              })
              .safeParse(customer).success
          )
            throw new AppError(
              409,
              'PAYMENT_CUSTOMER_INVALID',
              'Update your account/contact details before payment',
            );
          const operation = await tx.orm.public.PaymentSession.create({
            paymentAttemptId: attempt.id,
            integrationId,
            ownerId,
          });
          return {
            operation,
            input: {
              reference: operation.id,
              amountPiastres: Number(attempt.amountPiastres),
              expiresAt: new Date(attempt.expiresAt).toISOString(),
              customer,
            },
          };
        },
      );
      if (!claim.input) return summary(claim.operation);
      // Commit the REQUESTING row before sending. Concurrent callers and process
      // restarts see it and cannot resend, including after an ambiguous timeout.
      let result: z.infer<typeof resultSchema>;
      try {
        result = resultSchema.parse(
          await dependencies.provider.createPayment(claim.input),
        );
      } catch (error) {
        const status =
          error instanceof PaymentProviderError && !error.uncertain
            ? 'FAILED'
            : 'UNKNOWN';
        const row = await db.orm.public.PaymentSession.where({
          id: claim.operation.id,
          status: 'REQUESTING',
        }).update({ status, updatedAt: new Date().toISOString() });
        return summary(row);
      }
      const references = {
        intentionId: result.intentionId,
        orderId: result.orderId,
      };
      let row: Operation | null;
      try {
        row = await withPayableBooking(
          auth,
          bookingId,
          async ({ tx, booking }) => {
            if (
              booking.totalPiastres !== BigInt(claim.input!.amountPiastres) ||
              Date.parse(booking.expiresAt!) !==
                Date.parse(claim.input!.expiresAt)
            )
              throw new AppError(
                409,
                'PAYMENT_ATTEMPT_MISMATCH',
                'The booking changed during payment initialization',
              );
            return tx.orm.public.PaymentSession.where({
              id: claim.operation.id,
              status: 'REQUESTING',
            }).update({
              ...references,
              status: 'READY',
              encryptedCheckoutUrl: encryptCheckout(
                claim.operation.id,
                result.checkoutUrl,
                key,
              ),
              updatedAt: new Date().toISOString(),
            });
          },
        );
      } catch (error) {
        // A late response still keeps its provider references for reconciliation. It
        // cannot resurrect an expired booking or return a checkout for released seats.
        if (!(error instanceof AppError) || error.statusCode >= 500)
          throw error;
        row = await db.orm.public.PaymentSession.where({
          id: claim.operation.id,
          status: 'REQUESTING',
        }).update({
          ...references,
          status: 'EXPIRED',
          encryptedCheckoutUrl: null,
          updatedAt: new Date().toISOString(),
        });
      }
      return summary(row);
    },
  };
}
