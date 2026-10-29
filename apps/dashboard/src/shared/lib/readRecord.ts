import 'server-only';
import { z } from 'zod';
import { getLocale } from 'next-intl/server';
import { apiFetch } from './api';
import { apiFailure, type ApiResult } from './apiResult';

export async function readRecord<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<ApiResult<T>> {
  const result = await apiFetch<unknown>(path);
  if (!result.success) return { ...result, data: undefined };

  const parsed = schema.safeParse(result.data);
  if (!parsed.success)
    return apiFailure(502, 'UPSTREAM_ERROR', await getLocale());
  return { ...result, data: parsed.data };
}
