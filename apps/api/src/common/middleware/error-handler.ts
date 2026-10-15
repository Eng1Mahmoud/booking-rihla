import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error.ts';

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

  // Never expose unexpected errors, stack traces, or server details to clients.
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
