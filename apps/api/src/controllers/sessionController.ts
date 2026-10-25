import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import {
  loginSchema,
  emptySessionSchema,
  updateProfileSchema,
} from '../schemas/authSchema.ts';
import type {
  SessionService,
  AuthContext,
} from '../services/sessionService.ts';
export function refreshCookieName() {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-bus_refresh'
    : 'bus_refresh';
}
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
  };
}
function refreshCookie(request: Request) {
  const token: unknown = request.cookies?.[refreshCookieName()];
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
    ? token
    : undefined;
}
function validateJson(request: Request) {
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
function validateEmpty(request: Request) {
  validateJson(request);
  if (!emptySessionSchema.safeParse(request.body).success)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Request body must be an empty object',
    );
}
export function createSessionController(service: SessionService) {
  return {
    async login(request: Request, response: Response) {
      validateJson(request);
      const input = loginSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only a valid email and password (12-128 characters)',
        );
      sendSuccess(response, await service.login(input.data));
    },
    async refresh(request: Request, response: Response) {
      validateEmpty(request);
      const token = refreshCookie(request);
      if (!token) {
        response.clearCookie(refreshCookieName(), cookieOptions());
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      }
      try {
        sendSuccess(response, await service.refresh(token));
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 401)
          response.clearCookie(refreshCookieName(), cookieOptions());
        throw error;
      }
    },
    async me(request: Request, response: Response) {
      if (Object.keys(request.query).length)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'No query parameters are supported',
        );
      const auth = response.locals['auth'] as AuthContext;
      sendSuccess(response, auth.user);
    },
    async updateProfile(request: Request, response: Response) {
      validateJson(request);
      const input = updateProfileSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only name and international phone',
        );
      const auth = response.locals['auth'] as AuthContext;
      sendSuccess(
        response,
        await service.updateProfile(auth.user.id, input.data),
      );
    },
    async logout(request: Request, response: Response) {
      validateEmpty(request);
      await service.logout(refreshCookie(request));
      response.clearCookie(refreshCookieName(), cookieOptions());
      sendSuccess(response);
    },
    async logoutAll(request: Request, response: Response) {
      validateEmpty(request);
      const auth = response.locals['auth'] as AuthContext;
      await service.logoutAll(auth.user.id);
      response.clearCookie(refreshCookieName(), cookieOptions());
      sendSuccess(response);
    },
  };
}
