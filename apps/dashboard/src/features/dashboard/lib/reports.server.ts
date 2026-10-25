import 'server-only';
import { z } from 'zod';
import { getLocale } from 'next-intl/server';
import { apiFetch } from '@/shared/lib/api';
import { apiFailure, type ApiResult } from '@/shared/lib/apiResult';
import { requireAdministrator } from '@/features/auth/lib/access.server';
import {
  operationReportSchema,
  paymentReportSchema,
} from '../schemas/reportSchema';
async function readReport<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<ApiResult<T>> {
  const result = await apiFetch<unknown>(path);
  if (!result.success) return { ...result, data: undefined };
  const parsed = schema.safeParse(result.data);
  return parsed.success
    ? { ...result, data: parsed.data }
    : apiFailure(502, 'UPSTREAM_ERROR', await getLocale());
}
export async function getDashboardReports(date: string) {
  await requireAdministrator();
  const query = encodeURIComponent(date);
  const [operations, payments] = await Promise.all([
    readReport(
      'admin/statistics?travelDate=' + query,
      operationReportSchema.refine((report) => report.travelDate === date),
    ),
    readReport(
      'admin/payments/statistics?date=' + query,
      paymentReportSchema.refine((report) => report.date === date),
    ),
  ]);
  return { operations, payments };
}
