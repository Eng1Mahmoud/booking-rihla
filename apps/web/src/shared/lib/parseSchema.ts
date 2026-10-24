import 'server-only';
import type { z } from 'zod';
import { getLocale } from 'next-intl/server';
import { apiFailure, type ApiResult } from './apiResult';

type ParseResult<T> =
  { success: true; data: T } | { success: false; error: ApiResult<never> };

// Validate Action input once and return parsed/transformed data or one safe error.
export async function parseSchema<T>(
  schema: z.ZodType<T>,
  input: unknown,
): Promise<ParseResult<T>> {
  const parsed = await schema.safeParseAsync(input);
  if (parsed.success) return { success: true, data: parsed.data };
  // Do not serialize Zod issues or echo the submitted values.
  return {
    success: false,
    error: apiFailure(400, 'VALIDATION_ERROR', await getLocale()),
  };
}
