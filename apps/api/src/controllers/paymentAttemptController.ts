import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import {
  bookingIdSchema,
  bookingDetailsQuerySchema,
} from '../schemas/bookingSchema.ts';
import {
  paymentAttemptKeySchema,
  paymentAttemptBodySchema,
} from '../schemas/paymentAttemptSchema.ts';
import type { PaymentAttemptService } from '../services/paymentAttemptService.ts';
import type { AuthContext } from '../services/sessionService.ts';
function bookingId(request: Request) {
  const id = bookingIdSchema.safeParse(request.params.id);
  if (
    !id.success ||
    !bookingDetailsQuerySchema.safeParse(request.query).success
  )
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid booking UUID without query parameters',
    );
  return id.data;
}
export function createPaymentAttemptController(service: PaymentAttemptService) {
  return {
    async prepare(request: Request, response: Response) {
      if (!request.is('application/json'))
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      const id = bookingId(request);
      const key = paymentAttemptKeySchema.safeParse(
        request.get('Idempotency-Key'),
      );
      if (
        !key.success ||
        !paymentAttemptBodySchema.safeParse(request.body).success
      )
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide a UUID Idempotency-Key header and an empty JSON object',
        );
      const result = await service.prepare(
        response.locals['auth'] as AuthContext,
        id,
        key.data,
      );
      response
        .location('/api/v1/bookings/' + id + '/payment-attempt')
        .status(result.created ? 201 : 200)
        .json({ data: result.data });
    },
    async get(request: Request, response: Response) {
      const id = bookingId(request);
      const auth = response.locals['auth'] as AuthContext;
      const data = await service.findByBooking(auth.user.id, id);
      if (!data)
        throw new AppError(
          404,
          'PAYMENT_ATTEMPT_NOT_FOUND',
          'Payment attempt not found',
        );
      response.json({ data });
    },
  };
}
