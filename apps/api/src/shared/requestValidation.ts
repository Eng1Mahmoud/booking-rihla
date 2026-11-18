import type { Request } from 'express';
import type { ZodType, output } from 'zod';
import { AppError } from '../errors/AppError.ts';

export function parseInput<Schema extends ZodType>(
  schema: Schema,
  value: unknown,
  message: string,
): output<Schema> {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', message);
  return result.data;
}

export function requireJson(request: Request) {
  if (!request.is('application/json'))
    throw new AppError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json',
    );
}

export function requireNoQuery(request: Request) {
  if (Object.keys(request.query).length)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'No query parameters are supported',
    );
}
