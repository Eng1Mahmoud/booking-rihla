import { z } from 'zod';
const id = z
  .string()
  .regex(/^[1-9][0-9]{0,15}$/)
  .refine((v) => Number.isSafeInteger(Number(v)));
const positive = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const transaction = z.object({
  id,
  orderId: id,
  integrationId: positive,
  ownerId: positive,
  amountPiastres: positive,
  currency: z.literal('EGP'),
  pending: z.boolean(),
  success: z.boolean(),
  authorization: z.boolean(),
  capture: z.boolean(),
  voided: z.boolean(),
  refunded: z.boolean(),
  standalone: z.boolean(),
  live: z.literal(false),
  capturedPiastres: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
// The callback selects a candidate only. Money state always comes from inquiry.
export function verifiedPayment(
  raw: unknown,
  expected: {
    transactionId: string;
    orderId: string;
    integrationId: string;
    ownerId: string;
    amountPiastres: bigint;
  },
) {
  const parsed = transaction.safeParse(raw);
  if (!parsed.success) return null;
  const t = parsed.data;
  if (
    t.id !== expected.transactionId ||
    t.orderId !== expected.orderId ||
    String(t.integrationId) !== expected.integrationId ||
    String(t.ownerId) !== expected.ownerId ||
    BigInt(t.amountPiastres) !== expected.amountPiastres ||
    t.capturedPiastres > t.amountPiastres
  )
    return null;
  return t;
}
