import 'server-only';
import type { z } from 'zod';
import { getLocale } from 'next-intl/server';
import { validationError, type ApiResult } from './apiResult';

type ParseResult<T> =
  { success: true; data: T } | { success: false; error: ApiResult<never> };

// Validate Action input once and return parsed/transformed data or one safe error.
export async function parseSchema<T>(
  schema: z.ZodType<T>,
  input: unknown,
  // Route Handlers supply their language; Actions use the current page locale.
  locale?: string,
): Promise<ParseResult<T>> {
  const parsed = await schema.safeParseAsync(input);
  if (parsed.success) return { success: true, data: parsed.data };
  // Do not serialize Zod issues or echo the submitted values.
  return {
    success: false,
    error: validationError(locale ?? (await getLocale())),
  };
}
