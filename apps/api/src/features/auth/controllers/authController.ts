import { sendSuccess } from '../../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import {
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../schemas/authSchema.ts';
import { authService } from '../services/authService.ts';
import {
  parseInput,
  requireJson,
  requireNoQuery,
} from '../../../shared/requestValidation.ts';

export const authController = {
  async register(request: Request, response: Response) {
    requireJson(request);
    requireNoQuery(request);
    const input = parseInput(
      registerSchema,
      request.body,
      'Provide only name (1-100 characters), email, international phone, password (12-128 characters, at most 512 bytes), and optional language ar/en',
    );
    const verificationId = await authService.register(input);
    sendSuccess(
      response.status(202),
      { verificationId },
      'REGISTRATION_PENDING',
    );
  },
  async verifyEmail(request: Request, response: Response) {
    requireJson(request);
    requireNoQuery(request);
    const input = parseInput(
      verifyEmailSchema,
      request.body,
      'Provide only email, verificationId (UUID) and a six-digit code string',
    );
    await authService.verifyEmail(input);
    sendSuccess(response, undefined, 'EMAIL_VERIFIED');
  },
  async resendVerification(request: Request, response: Response) {
    requireJson(request);
    requireNoQuery(request);
    const input = parseInput(
      resendVerificationSchema,
      request.body,
      'Provide only email and verificationId (UUID)',
    );
    await authService.resendVerification(input);
    sendSuccess(response.status(202), undefined, 'VERIFICATION_SENT');
  },
};
