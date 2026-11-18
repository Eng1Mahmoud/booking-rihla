import { sendSuccess } from '../../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../../errors/AppError.ts';
import {
  loginSchema,
  emptySessionSchema,
  updateProfileSchema,
} from '../schemas/authSchema.ts';
import {
  sessionService,
  type AuthContext,
} from '../services/sessionService.ts';
import {
  parseInput,
  requireJson,
  requireNoQuery,
} from '../../../shared/requestValidation.ts';
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
function validateEmpty(request: Request) {
  requireJson(request);
  requireNoQuery(request);
  parseInput(
    emptySessionSchema,
    request.body,
    'Request body must be an empty object',
  );
}

export const sessionController = {
  async login(request: Request, response: Response) {
    requireJson(request);
    requireNoQuery(request);
    const input = parseInput(
      loginSchema,
      request.body,
      'Provide only a valid email and password (12-128 characters)',
    );
    sendSuccess(response, await sessionService.login(input));
  },
  async refresh(request: Request, response: Response) {
    validateEmpty(request);
    const token = refreshCookie(request);
    if (!token) {
      response.clearCookie(refreshCookieName(), cookieOptions());
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }
    try {
      sendSuccess(response, await sessionService.refresh(token));
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401)
        response.clearCookie(refreshCookieName(), cookieOptions());
      throw error;
    }
  },
  async me(request: Request, response: Response) {
    requireNoQuery(request);
    const auth = response.locals['auth'] as AuthContext;
    sendSuccess(response, auth.user);
  },
  async updateProfile(request: Request, response: Response) {
    requireJson(request);
    requireNoQuery(request);
    const input = parseInput(
      updateProfileSchema,
      request.body,
      'Provide only name and international phone',
    );
    const auth = response.locals['auth'] as AuthContext;
    sendSuccess(
      response,
      await sessionService.updateProfile(auth.user.id, input),
    );
  },
  async logout(request: Request, response: Response) {
    validateEmpty(request);
    await sessionService.logout(refreshCookie(request));
    response.clearCookie(refreshCookieName(), cookieOptions());
    sendSuccess(response);
  },
  async logoutAll(request: Request, response: Response) {
    validateEmpty(request);
    const auth = response.locals['auth'] as AuthContext;
    await sessionService.logoutAll(auth.user.id);
    response.clearCookie(refreshCookieName(), cookieOptions());
    sendSuccess(response);
  },
};
