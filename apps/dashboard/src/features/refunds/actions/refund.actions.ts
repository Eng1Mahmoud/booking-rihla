'use server';
import { apiFetch } from '@/shared/lib/api';
import type { Refund } from '../schemas/refundSchema';

export async function getRefundsAction(query: string) {
  return apiFetch<{ items: Refund[]; total: number }>('admin/refunds?' + query);
}

export async function executeRefundAction(input: {
  id: string;
  operation: 'issue' | 'reconcile';
}) {
  return apiFetch('admin/refunds/' + input.id + '/' + input.operation, {
    method: 'POST',
  });
}
