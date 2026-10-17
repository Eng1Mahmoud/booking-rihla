import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import {
  bookingIdSchema,
  bookingDetailsQuerySchema,
} from '../schemas/bookingSchema.ts';
import { paymentAttemptBodySchema } from '../schemas/paymentAttemptSchema.ts';
import type { PaymentCheckoutService } from '../services/paymentCheckoutService.ts';
import type { AuthContext } from '../services/sessionService.ts';
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
export function createPaymentCheckoutController(
  service: PaymentCheckoutService,
) {
  return {
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
      const data = await service.start(
        response.locals['auth'] as AuthContext,
        bookingId,
      );
      response
        .set('Referrer-Policy', 'no-referrer')
        .location('/api/v1/bookings/' + bookingId + '/payment')
        .json({ data });
    },
    async get(request: Request, response: Response) {
      const bookingId = id(request),
        auth = response.locals['auth'] as AuthContext;
      response.json({ data: await service.get(auth.user.id, bookingId) });
    },
  };
}
