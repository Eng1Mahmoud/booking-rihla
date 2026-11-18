import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { paymobWebhookService } from './paymobWebhookService.ts';
import { parseInput, requireJson } from '../../shared/requestValidation.ts';
const querySchema = z.strictObject({
  hmac: z.string().regex(/^[a-fA-F0-9]{128}$/),
});

export const paymobWebhookController = async (
  request: Request,
  response: Response,
) => {
  response.set('Cache-Control', 'no-store');
  requireJson(request);
  const query = parseInput(
    querySchema,
    request.query,
    'Provide one valid hmac query parameter',
  );
  await paymobWebhookService.receive(request.body, query.hmac);
  // Acknowledge durable receipt only; this is never a booking/payment result.
  sendSuccess(response.status(200), { received: true });
};
