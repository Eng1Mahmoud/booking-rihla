import { sendSuccess } from '../../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { setTimeout } from 'node:timers/promises';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/passwordResetSchema.ts';
import { passwordResetService } from '../services/passwordResetService.ts';
import {
  parseInput,
  requireJson,
  requireNoQuery,
} from '../../../shared/requestValidation.ts';

export const passwordResetController = {
  async forgot(request: Request, response: Response) {
    requireJson(request);
    requireNoQuery(request);
    const input = parseInput(
      forgotPasswordSchema,
      request.body,
      'Provide only a valid email',
    );
    const started = Date.now();
    await passwordResetService.requestReset(input.email);
    // Reduce easy timing differences between queued, throttled and unknown accounts.
    await setTimeout(Math.max(0, 250 - (Date.now() - started)));
    sendSuccess(response.status(202), undefined, 'PASSWORD_RESET_REQUESTED');
  },
  async reset(request: Request, response: Response) {
    requireJson(request);
    requireNoQuery(request);
    const input = parseInput(
      resetPasswordSchema,
      request.body,
      'Provide email, a six-digit code string, and matching newPassword/confirmPassword (12-128 characters, at most 512 bytes)',
    );
    await passwordResetService.resetPassword(input);
    sendSuccess(response, undefined, 'PASSWORD_RESET');
  },
};
