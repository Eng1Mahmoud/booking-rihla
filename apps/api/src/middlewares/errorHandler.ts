import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError.ts';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  // Express must finish handling failures after a response has already started.
  if (response.headersSent) {
    next(error);
    return;
  }

  // Convert known JSON parser errors without exposing the submitted body.
  if (error instanceof Error && 'type' in error && 'status' in error) {
    if (error.type === 'entity.parse.failed' && error.status === 400) {
      error = new AppError(
        400,
        'INVALID_JSON',
        'Request body must be valid JSON',
      );
    } else if (error.type === 'entity.too.large' && error.status === 413) {
      error = new AppError(
        413,
        'PAYLOAD_TOO_LARGE',
        'JSON request body must not exceed 100kb',
      );
    }
  }

  // Explicit operational unavailability has a fixed public message, not an
  // arbitrary upstream/server exception message.
  if (
    error instanceof AppError &&
    error.statusCode === 503 &&
    error.code === 'PAYMENT_UNAVAILABLE'
  ) {
    response.status(503).json({
      error: {
        code: 'PAYMENT_UNAVAILABLE',
        message: 'Payment is temporarily unavailable',
      },
    });
    return;
  }

  if (
    error instanceof AppError &&
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  ) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  console.error(
    JSON.stringify({
      event: 'unhandled_request_error',
      requestId: response.locals.requestId,
      code: 'INTERNAL_SERVER_ERROR',
    }),
  );
  // Never expose unexpected errors, stack traces, or server details to clients.
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
