import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const transactionSchema = z.object({
  amount_cents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  created_at: z.string().min(1).max(100),
  currency: z.string().length(3),
  error_occured: z.boolean(),
  has_parent_transaction: z.boolean(),
  id,
  integration_id: id,
  is_3d_secure: z.boolean(),
  is_auth: z.boolean(),
  is_capture: z.boolean(),
  is_refunded: z.boolean(),
  is_standalone_payment: z.boolean(),
  is_voided: z.boolean(),
  order: z.object({ id }),
  owner: id,
  pending: z.boolean(),
  source_data: z.object({
    pan: z.union([
      z.string().max(100),
      z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    ]),
    sub_type: z.string().max(100),
    type: z.string().max(100),
  }),
  success: z.boolean(),
});
const callbackSchema = z.object({
  type: z.literal('TRANSACTION'),
  obj: transactionSchema,
});
// Only the documented signed fields are trusted here. Unsigned fields such as
// is_live/parent_transaction need authenticated transaction inquiry before use.
export function verifyPaymobCallback(
  body: unknown,
  signature: unknown,
  secret: string,
) {
  if (
    typeof signature !== 'string' ||
    !/^[a-fA-F0-9]{128}$/.test(signature) ||
    !secret
  )
    return null;
  const parsed = callbackSchema.safeParse(body);
  if (!parsed.success) return null;
  const t = parsed.data.obj;
  const canonical = [
    t.amount_cents,
    t.created_at,
    t.currency,
    t.error_occured,
    t.has_parent_transaction,
    t.id,
    t.integration_id,
    t.is_3d_secure,
    t.is_auth,
    t.is_capture,
    t.is_refunded,
    t.is_standalone_payment,
    t.is_voided,
    t.order.id,
    t.owner,
    t.pending,
    t.source_data.pan,
    t.source_data.sub_type,
    t.source_data.type,
    t.success,
  ]
    .map(String)
    .join('');
  const expected = createHmac('sha512', secret).update(canonical).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return null;
  // Hash the signed payload rather than just transaction id: pending -> success
  // and refund updates can legitimately reuse the same transaction id.
  return {
    eventKey: createHash('sha256').update(canonical).digest('hex'),
    transactionId: String(t.id),
    orderId: String(t.order.id),
    integrationId: t.integration_id,
    ownerId: t.owner,
    amountPiastres: t.amount_cents,
    currency: t.currency,
    pending: t.pending,
    success: t.success,
    authorization: t.is_auth,
    capture: t.is_capture,
    voided: t.is_voided,
    refunded: t.is_refunded,
    standalone: t.is_standalone_payment,
    error: t.error_occured,
  };
}
