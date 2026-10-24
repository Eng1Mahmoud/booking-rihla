'use server';

import { apiFetch } from '@/shared/lib/api';
import { parseSchema } from '@/shared/lib/parseSchema';
import { paymentHistoryOffsetSchema } from '../schemas/paymentHistorySchema';
import type { PaymentHistoryPage } from '../types/payment';
import type { AuthUser } from '@/features/auth/types/auth';
import { profileSchema, type ProfileInput } from '../schemas/profileSchema';

export async function updateProfileAction(input: ProfileInput) {
  const parsed = await parseSchema(profileSchema, input);
  if (!parsed.success) return parsed.error;
  return apiFetch<AuthUser>('auth/me', {
    method: 'PATCH',
    body: parsed.data,
  });
}

export async function getPaymentHistoryAction(offset: number) {
  const parsed = await parseSchema(paymentHistoryOffsetSchema, offset);
  if (!parsed.success) return parsed.error;
  return apiFetch<PaymentHistoryPage>(
    'account/payments?limit=20&offset=' + parsed.data,
  );
}
