import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess, sendFailure } from '../utils/apiResponse.ts';
import type { AuthContext } from '../services/sessionService.ts';
import type { TicketScanService } from '../services/ticketScanService.ts';

const scanBodySchema = z.object({
  payload: z.string().trim().min(20).max(2048),
  action: z.enum(['verify', 'board']).default('verify'),
  language: z.enum(['ar', 'en']).optional(),
});

export function createTicketScanController(service: TicketScanService) {
  return {
    async scan(request: Request, response: Response, next: NextFunction) {
      try {
        const parsed = scanBodySchema.safeParse(request.body);
        if (!parsed.success) {
          sendFailure(response, 400, 'VALIDATION_ERROR');
          return;
        }
        const auth = response.locals['auth'] as AuthContext;
        const result = await service.scan({
          payload: parsed.data.payload,
          action: parsed.data.action,
          staffUserId: auth.user.id,
          language: parsed.data.language,
        });

        const http =
          result.code === 'INVALID_QR' || result.code === 'NOT_FOUND'
            ? 404
            : result.code === 'NOT_ELIGIBLE'
              ? 409
              : result.code === 'OUTSIDE_WINDOW'
                ? 409
                : result.code === 'ALREADY_BOARDED'
                  ? 200
                  : 200;

        sendSuccess(response, result, http);
      } catch (error) {
        next(error);
      }
    },
  };
}
