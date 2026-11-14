import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import {
  bookingIdSchema,
  bookingDetailsQuerySchema,
} from '../bookings/bookingSchema.ts';
import { paymentAttemptBodySchema } from './paymentAttemptSchema.ts';
import { paymentCheckoutService } from './paymentCheckoutService.ts';
import type { AuthContext } from '../auth/sessionService.ts';
function id(request: Request) {
  const parsed = bookingIdSchema.safeParse(request.params.id);
  if (
    !parsed.success ||
    !bookingDetailsQuerySchema.safeParse(request.query).success
  )
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Provide a booking UUID without query parameters',
    );
  return parsed.data;
}

export const paymentCheckoutController = {
  async refresh(request: Request, response: Response) {
    const bookingId = id(request);
    if (!request.is('application/json'))
      throw new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json',
      );
    if (!paymentAttemptBodySchema.safeParse(request.body).success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Provide an empty JSON object',
      );
    const auth = response.locals['auth'] as AuthContext;
    sendSuccess(
      response.set('Cache-Control', 'no-store'),
      await paymentCheckoutService.refresh(auth.user.id, bookingId),
    );
  },
  async start(request: Request, response: Response) {
    if (!request.is('application/json'))
      throw new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json',
      );
    const bookingId = id(request);
    if (!paymentAttemptBodySchema.safeParse(request.body).success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Provide an empty JSON object',
      );
    const data = await paymentCheckoutService.start(
      response.locals['auth'] as AuthContext,
      bookingId,
    );
    sendSuccess(
      response
        .set('Referrer-Policy', 'no-referrer')
        .location('/api/v1/bookings/' + bookingId + '/payment'),
      data,
    );
  },
  async get(request: Request, response: Response) {
    const bookingId = id(request),
      auth = response.locals['auth'] as AuthContext;
    sendSuccess(
      response,
      await paymentCheckoutService.get(auth.user.id, bookingId),
    );
  },
};
