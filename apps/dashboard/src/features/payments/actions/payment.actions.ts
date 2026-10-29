'use server';
import { apiFetch } from '@/shared/lib/api';
import type { Payment, PaymentFilters } from '../schemas/paymentSchema';

export async function getPaymentsAction(
  input: PaymentFilters & { limit: number; offset: number },
) {
  const { limit, offset, ...filters } = input;
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [key, value] of Object.entries(filters))
    if (value) params.set(key, value);
  return apiFetch<{ items: Payment[]; total: number }>(
    'admin/payments?' + params,
  );
}

export async function getPaymentAction(id: string) {
  return apiFetch<Payment>('admin/payments/' + id);
}
