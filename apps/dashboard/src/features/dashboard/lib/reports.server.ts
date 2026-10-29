import 'server-only';
import { apiFetch } from '@/shared/lib/api';
import type { OperationReport, PaymentReport } from '../types/report';

export async function getDashboardReports(date: string) {
  const query = encodeURIComponent(date);
  const [operations, payments] = await Promise.all([
    apiFetch<OperationReport>('admin/statistics?travelDate=' + query),
    apiFetch<PaymentReport>('admin/payments/statistics?date=' + query),
  ]);
  return { operations, payments };
}
