'use server';
import { apiFetch } from '@/shared/lib/api';
import type { Payment } from '../schemas/paymentSchema';

export async function getPaymentsAction(query: string) {
  return apiFetch<{ items: Payment[]; total: number }>(
    'admin/payments?' + query,
  );
}

export async function getPaymentAction(id: string) {
  return apiFetch<Payment>('admin/payments/' + id);
}
