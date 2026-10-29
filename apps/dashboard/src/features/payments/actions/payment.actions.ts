'use server';
import { z } from 'zod';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readListPage } from '@/shared/lib/readListPage';
import { readRecord } from '@/shared/lib/readRecord';
import {
  paymentSchema,
  paymentListSchema,
  type PaymentFilters,
} from '../schemas/paymentSchema';
export async function getPaymentsAction(
  input: PaymentFilters & { limit: number; offset: number },
) {
  const parsed = await parseSchema(paymentListSchema, input);
  if (!parsed.success) return parsed.error;
  const { limit, offset, ...filters } = parsed.data;
  return readListPage(
    'admin/payments',
    { limit, offset },
    paymentSchema,
    filters,
  );
}
export async function getPaymentAction(id: string) {
  const parsed = await parseSchema(z.uuid(), id);
  if (!parsed.success) return parsed.error;
  return readRecord('admin/payments/' + parsed.data, paymentSchema);
}
