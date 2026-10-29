'use server';
import { apiFetch } from '@/shared/lib/api';
import type { Refund } from '../schemas/refundSchema';

export async function getRefundsAction(input: {
  limit: number;
  offset: number;
}) {
  const params = new URLSearchParams({
    limit: String(input.limit),
    offset: String(input.offset),
  });
  return apiFetch<{ items: Refund[]; total: number }>(
    'admin/refunds?' + params,
  );
}

export async function executeRefundAction(input: {
  id: string;
  operation: 'issue' | 'reconcile';
}) {
  return apiFetch('admin/refunds/' + input.id + '/' + input.operation, {
    method: 'POST',
  });
}
