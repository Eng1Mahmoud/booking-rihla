import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../errors/AppError.ts';
import { verifyPaymobCallback } from '../payments/paymobHmac.ts';

// Receiving signed events stays independent from enabling new checkout.
const positiveId = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
export const paymobWebhookSchema = z.object({
  PAYMOB_HMAC_SECRET: z.string().min(1),
  PAYMOB_INTEGRATION_ID: positiveId,
  PAYMOB_OWNER_ID: z.preprocess(
    (value) => (value === '' ? undefined : value),
    positiveId.optional(),
  ),
});
type PaymobWebhookConfig = z.output<typeof paymobWebhookSchema>;

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
    const flag = process.env.PAYMOB_WEBHOOK_ENABLED;
    if (flag !== undefined && flag !== 'true' && flag !== 'false')
      throw new Error('Invalid webhook configuration: PAYMOB_WEBHOOK_ENABLED');
    let config: PaymobWebhookConfig | null = null;
    if (flag === 'true') {
      const result = paymobWebhookSchema.safeParse(process.env);
      if (!result.success)
        throw new Error(
          'Invalid webhook configuration: ' +
            [
              ...new Set(
                result.error.issues.map((issue) => issue.path.join('.')),
              ),
            ].join(', '),
        );
      config = result.data;
    }
    const event = validatePaymobEvent(body, signature, config);
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
