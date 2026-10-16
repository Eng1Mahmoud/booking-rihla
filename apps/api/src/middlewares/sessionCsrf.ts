import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError.ts';
export function sessionCsrf(allowedOrigins: string[]): RequestHandler {
  return (request, _response, next) => {
    const origin = request.headers.origin;
    if (
      request.get('X-CSRF-Protection') !== '1' ||
      (origin !== undefined && !allowedOrigins.includes(origin))
    )
      throw new AppError(
        403,
        'CSRF_REJECTED',
        'Request origin or CSRF protection header is invalid',
      );
    next();
  };
}
