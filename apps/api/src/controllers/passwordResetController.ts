import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { setTimeout } from 'node:timers/promises';
import { AppError } from '../errors/AppError.ts';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/passwordResetSchema.ts';
import type { PasswordResetService } from '../services/passwordResetService.ts';
function requireJson(request: Request) {
  if (!request.is('application/json'))
    throw new AppError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json',
    );
  if (Object.keys(request.query).length)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'No query parameters are supported',
    );
}
export function createPasswordResetController(service: PasswordResetService) {
  return {
    async forgot(request: Request, response: Response) {
      requireJson(request);
      const input = forgotPasswordSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only a valid email',
        );
      const started = Date.now();
      await service.requestReset(input.data.email);
      // Reduce easy timing differences between queued, throttled and unknown accounts.
      await setTimeout(Math.max(0, 250 - (Date.now() - started)));
      sendSuccess(response.status(202), undefined, 'PASSWORD_RESET_REQUESTED');
    },
    async reset(request: Request, response: Response) {
      requireJson(request);
      const input = resetPasswordSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide email, a six-digit code string, and matching newPassword/confirmPassword (12-128 characters, at most 512 bytes)',
        );
      await service.resetPassword(input.data);
      sendSuccess(response, undefined, 'PASSWORD_RESET');
    },
  };
}
