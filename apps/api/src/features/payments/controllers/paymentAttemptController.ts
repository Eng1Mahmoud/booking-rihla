import { sendSuccess } from '../../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../../errors/AppError.ts';
import {
  bookingIdSchema,
  bookingDetailsQuerySchema,
} from '../../bookings/schemas/bookingSchema.ts';
import {
  paymentAttemptKeySchema,
  paymentAttemptBodySchema,
} from '../schemas/paymentAttemptSchema.ts';
import { paymentAttemptService } from '../services/paymentAttemptService.ts';
import type { AuthContext } from '../../auth/services/sessionService.ts';
import { requireJson } from '../../../shared/requestValidation.ts';
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

export const paymentAttemptController = {
  async prepare(request: Request, response: Response) {
    requireJson(request);
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
    const result = await paymentAttemptService.prepare(
      response.locals['auth'] as AuthContext,
      id,
      key.data,
    );
    sendSuccess(
      response
        .location('/api/v1/bookings/' + id + '/payment-attempt')
        .status(result.created ? 201 : 200),
      result.data,
    );
  },
  async get(request: Request, response: Response) {
    const id = bookingId(request);
    const auth = response.locals['auth'] as AuthContext;
    const data = await paymentAttemptService.findByBooking(auth.user.id, id);
    if (!data)
      throw new AppError(
        404,
        'PAYMENT_ATTEMPT_NOT_FOUND',
        'Payment attempt not found',
      );
    sendSuccess(response, data);
  },
};
