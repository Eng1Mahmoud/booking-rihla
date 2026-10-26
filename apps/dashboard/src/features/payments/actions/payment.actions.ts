'use server';
import { z } from 'zod';
import { checkStaffAccess } from '@/features/auth/lib/access.server';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readWindowPage, readRecord } from '@/shared/lib/readWindowPage';
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
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const { limit, offset, ...filters } = parsed.data;
  return readWindowPage(
    'admin/payments',
    { limit, offset },
    paymentSchema,
    filters,
  );
}
export async function getPaymentAction(id: string) {
  const parsed = await parseSchema(z.uuid(), id);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return readRecord('admin/payments/' + parsed.data, paymentSchema);
}
