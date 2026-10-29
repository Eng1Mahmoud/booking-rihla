import 'server-only';
import { getLocale } from 'next-intl/server';
import type { z } from 'zod';
import { apiFailure, type ApiResult } from './apiResult';
import { readListPage } from './readListPage';

// Reject partial or inconsistent option lists instead of returning them to editors.
export async function readListOptions<T extends { id: string }>(
  path: string,
  schema: z.ZodType<T>,
  search?: string,
): Promise<ApiResult<T[]>> {
  const locale = await getLocale();
  const items: T[] = [];
  const ids = new Set<string>();
  let expectedTotal: number | undefined;

  for (let offset = 0; offset <= 100000; offset += 100) {
    const result = await readListPage(
      path,
      { limit: 100, offset, ...(search === undefined ? {} : { search }) },
      schema,
    );
    if (!result.success || !result.data) return { ...result, data: undefined };

    const page = result.data;
    if (expectedTotal !== undefined && page.total !== expectedTotal)
      return apiFailure(502, 'UPSTREAM_ERROR', locale);
    expectedTotal = page.total;

    for (const item of page.items) {
      if (ids.has(item.id)) return apiFailure(502, 'UPSTREAM_ERROR', locale);
      ids.add(item.id);
      items.push(item);
    }
    if (items.length === page.total) return { ...result, data: items };
    if (page.items.length !== 100 || items.length > page.total)
      return apiFailure(502, 'UPSTREAM_ERROR', locale);
  }

  return apiFailure(502, 'UPSTREAM_ERROR', locale);
}
