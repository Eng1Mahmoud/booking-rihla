import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError.ts';
import {
  sessionService,
  type SessionService,
} from '../services/sessionService.ts';
export function requireAuth(
  service: SessionService = sessionService,
): RequestHandler {
  return async (request, response, next) => {
    const header = request.headers.authorization;
    const token =
      typeof header === 'string'
        ? (header.match(/^Bearer ([^\s]+)$/i)?.[1] ?? '')
        : '';
    if (!token || token.length > 4096)
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    response.locals['auth'] = await service.authenticateAccessToken(token);
    next();
  };
}
