import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../errors/AppError.ts';
import { paymobWebhookService } from './paymobWebhookService.ts';
const querySchema = z.strictObject({
  hmac: z.string().regex(/^[a-fA-F0-9]{128}$/),
});

export const paymobWebhookController = async (
  request: Request,
  response: Response,
) => {
  response.set('Cache-Control', 'no-store');
  if (!request.is('application/json'))
    throw new AppError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json',
    );
  const query = querySchema.safeParse(request.query);
  if (!query.success)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Provide one valid hmac query parameter',
    );
  await paymobWebhookService.receive(request.body, query.data.hmac);
  // Acknowledge durable receipt only; this is never a booking/payment result.
  sendSuccess(response.status(200), { received: true });
};
