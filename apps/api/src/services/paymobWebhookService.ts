import { randomUUID } from 'node:crypto';
import {
  parsePaymobWebhookEnv,
  type PaymobWebhookConfig,
} from '../config/paymob.ts';
import { AppError } from '../errors/AppError.ts';
import { verifyPaymobCallback } from '../payments/paymobHmac.ts';

export function validatePaymobEvent(
  body: unknown,
  signature: unknown,
  config: PaymobWebhookConfig | null,
) {
  if (!config)
    throw new AppError(
      404,
      'PAYMENT_WEBHOOK_DISABLED',
      'Payment webhook is not enabled',
    );
  const event = verifyPaymobCallback(
    body,
    signature,
    config.PAYMOB_HMAC_SECRET,
  );
  if (!event)
    throw new AppError(
      401,
      'INVALID_PAYMENT_SIGNATURE',
      'Invalid payment notification',
    );
  if (
    event.integrationId !== config.PAYMOB_INTEGRATION_ID ||
    event.currency !== 'EGP' ||
    (config.PAYMOB_OWNER_ID !== undefined &&
      event.ownerId !== config.PAYMOB_OWNER_ID)
  )
    throw new AppError(
      403,
      'PAYMENT_NOTIFICATION_MISMATCH',
      'Payment notification is not for this integration',
    );
  return event;
}

export const paymobWebhookService = {
  async receive(body: unknown, signature: unknown) {
    const event = validatePaymobEvent(
      body,
      signature,
      parsePaymobWebhookEnv(process.env),
    );
    // Import after validation: disabled/forged callbacks never open the database.
    const { db } = await import('../prisma/db.ts');
    // One atomic statement handles concurrent redelivery. Never store the raw
    // request, HMAC, card fragments, customer data or unsigned payment flags.
    await db.transaction(async (tx) => {
      await tx.execute(
        db.raw.sql`INSERT INTO "public"."PaymentEvent"
        ("id", "eventKey", "transactionId", "orderId", "integrationId", "ownerId", "signedJson", "receivedAt")
        VALUES (${randomUUID()}, ${event.eventKey}, ${event.transactionId}, ${event.orderId},
          ${String(event.integrationId)}, ${String(event.ownerId)}, ${JSON.stringify(event)}, NOW())
        ON CONFLICT ("eventKey") DO NOTHING`
          .affectedCount()
          .build(),
      );
    });
  },
};
export type PaymobWebhookService = typeof paymobWebhookService;
