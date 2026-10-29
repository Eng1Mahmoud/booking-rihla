'use server';
import { z } from 'zod';
import { checkStaffAccess } from '@/features/auth/lib/access.server';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readListPage } from '@/shared/lib/readListPage';
import { apiFetch } from '@/shared/lib/api';
import { refundSchema } from '../schemas/refundSchema';
export async function getRefundsAction(input: {
  limit: number;
  offset: number;
}) {
  const parsed = await parseSchema(
    z.object({
      limit: z.number().int().min(1).max(100),
      offset: z.number().int().min(0).max(100000),
    }),
    input,
  );
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess(['SUPER_ADMIN']);
  if (!access.success) return access;
  return readListPage('admin/refunds', parsed.data, refundSchema);
}
export async function executeRefundAction(input: {
  id: string;
  operation: 'issue' | 'reconcile';
}) {
  const parsed = await parseSchema(
    z.object({ id: z.uuid(), operation: z.enum(['issue', 'reconcile']) }),
    input,
  );
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess(['SUPER_ADMIN']);
  if (!access.success) return access;
  return apiFetch(
    'admin/refunds/' + parsed.data.id + '/' + parsed.data.operation,
    { method: 'POST' },
  );
}
