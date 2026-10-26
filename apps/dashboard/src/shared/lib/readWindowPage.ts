import 'server-only';
import { z } from 'zod';
import { getLocale } from 'next-intl/server';
import { apiFetch } from './api';
import { apiFailure, type ApiResult } from './apiResult';
export type WindowPage<T> = { items: T[]; hasNextPage: boolean };
// Read one extra record when an existing endpoint does not provide a total.
export async function readWindowPage<T>(
  path: string,
  input: { limit: number; offset: number },
  schema: z.ZodType<T>,
  filters: Record<string, string> = {},
): Promise<ApiResult<WindowPage<T>>> {
  const locale = await getLocale();
  if (
    input.limit < 1 ||
    input.limit > 99 ||
    input.offset < 0 ||
    input.offset > 100000
  )
    return apiFailure(400, 'VALIDATION_ERROR', locale);
  const params = new URLSearchParams({
    limit: String(input.limit + 1),
    offset: String(input.offset),
  });
  for (const [key, value] of Object.entries(filters))
    if (value) params.set(key, value);
  const result = await apiFetch<unknown>(path + '?' + params);
  if (!result.success) return { ...result, data: undefined };
  const parsed = z
    .object({
      items: z.array(schema).max(input.limit + 1),
      pagination: z.object({
        limit: z.literal(input.limit + 1),
        offset: z.literal(input.offset),
      }),
    })
    .safeParse(result.data);
  if (!parsed.success) return apiFailure(502, 'UPSTREAM_ERROR', locale);
  if (
    parsed.data.items.length > input.limit &&
    input.offset + input.limit > 100000
  )
    return apiFailure(502, 'UPSTREAM_ERROR', locale);
  return {
    ...result,
    data: {
      items: parsed.data.items.slice(0, input.limit),
      hasNextPage: parsed.data.items.length > input.limit,
    },
  };
}
export async function readWindowOptions<T extends { id: string }>(
  path: string,
  schema: z.ZodType<T>,
): Promise<ApiResult<T[]>> {
  const items: T[] = [];
  const ids = new Set<string>();
  for (let offset = 0; offset <= 100000; offset += 99) {
    const result = await readWindowPage(path, { limit: 99, offset }, schema);
    if (!result.success || !result.data) return { ...result, data: undefined };
    for (const item of result.data.items) {
      if (ids.has(item.id))
        return apiFailure(502, 'UPSTREAM_ERROR', await getLocale());
      ids.add(item.id);
      items.push(item);
    }
    if (!result.data.hasNextPage) return { ...result, data: items };
  }
  return apiFailure(502, 'UPSTREAM_ERROR', await getLocale());
}

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
