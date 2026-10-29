import 'server-only';
import { z } from 'zod';
import { getLocale } from 'next-intl/server';
import { apiFetch } from './api';
import { apiFailure, type ApiResult } from './apiResult';
import type { ListPage, ListQuery } from '@/shared/schemas/listSchema';

type PageInput = Pick<ListQuery, 'limit' | 'offset'> & { search?: string };

export async function readListPage<T>(
  path: string,
  input: PageInput,
  itemSchema: z.ZodType<T>,
  filters: Record<string, string> = {},
): Promise<ApiResult<ListPage<T>>> {
  const locale = await getLocale();
  const params = new URLSearchParams({
    limit: String(input.limit),
    offset: String(input.offset),
  });
  if (input.search !== undefined) {
    params.set('search', input.search);
    params.set('locale', locale);
  }
  for (const [key, value] of Object.entries(filters))
    if (value) params.set(key, value);

  const result = await apiFetch<unknown>(path + '?' + params);
  if (!result.success) return { ...result, data: undefined };
  const schema = z.strictObject({
    items: z.array(itemSchema).max(100),
    total: z.number().int().nonnegative(),
    pagination: z.strictObject({
      limit: z.number().int().min(1).max(100),
      offset: z.number().int().min(0).max(100000),
    }),
  });
  const page = schema.safeParse(result.data);
  if (
    !page.success ||
    page.data.pagination.limit !== input.limit ||
    page.data.pagination.offset !== input.offset
  )
    return apiFailure(502, 'UPSTREAM_ERROR', locale);
  return {
    ...result,
    data: { items: page.data.items, total: page.data.total },
  };
}
