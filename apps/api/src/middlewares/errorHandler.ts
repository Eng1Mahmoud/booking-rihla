import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError.ts';
import { sendFailure } from '../utils/apiResponse.ts';

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

  if (error instanceof AppError && Number.isInteger(error.statusCode)) {
    if (error.statusCode >= 400 && error.statusCode < 500) {
      sendFailure(response, error.statusCode, error.code);
      return;
    }
    if (error.statusCode === 503 && error.code === 'PAYMENT_UNAVAILABLE') {
      sendFailure(response, 503, error.code);
      return;
    }
  }
  console.error(
    JSON.stringify({
      event: 'unhandled_request_error',
      requestId: response.locals.requestId,
      code: 'INTERNAL_SERVER_ERROR',
    }),
  );
  sendFailure(response, 500, 'INTERNAL_SERVER_ERROR', true);
};
