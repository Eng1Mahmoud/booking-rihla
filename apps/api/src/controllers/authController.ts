import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import {
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../schemas/authSchema.ts';
import type { AuthService } from '../services/authService.ts';
export const registrationMessage =
  'If registration can proceed, a verification email will be sent';
export const resendMessage =
  'If the account needs verification and sending is allowed, a verification email will be sent';
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
export function createAuthController(service: AuthService) {
  return {
    async register(request: Request, response: Response) {
      requireJson(request);
      const input = registerSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only name (1-100 characters), email, international phone, password (12-128 characters, at most 512 bytes), and optional language ar/en',
        );
      await service.register(input.data);
      response.status(202).json({ message: registrationMessage });
    },
    async verifyEmail(request: Request, response: Response) {
      requireJson(request);
      const input = verifyEmailSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only email and a six-digit code string',
        );
      await service.verifyEmail(input.data);
      response.json({ message: 'Email verified successfully' });
    },
    async resendVerification(request: Request, response: Response) {
      requireJson(request);
      const input = resendVerificationSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only a valid email',
        );
      await service.resendVerification(input.data.email);
      response.status(202).json({ message: resendMessage });
    },
  };
}
